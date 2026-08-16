package com.visionforge.crms.proposal.service;

import com.visionforge.crms.email.EmailService;
import com.visionforge.crms.notification.model.NotificationType;
import com.visionforge.crms.notification.service.NotificationService;
import com.visionforge.crms.proposal.model.Proposal;
import com.visionforge.crms.proposal.model.ProposalStatus;
import com.visionforge.crms.proposal.repository.ProposalRepository;
import com.visionforge.crms.user.User;
import com.visionforge.crms.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Scheduled automation for proposal reminders and overdue status.
 *
 * Flow:
 *   Proposal created (PENDING)
 *     → Day 0-9  : no action
 *     → Day 10+  : if still PENDING and reminder not sent → send reminder email, set reminderEmailSentAt
 *     → Day 10+7 : if still PENDING and 7 days have elapsed since reminder → set status = OVERDUE
 *
 * ACCEPTED and REJECTED proposals are never touched.
 * OVERDUE proposals can still be ACCEPTED or REJECTED by the client.
 */
@Component
@RequiredArgsConstructor
public class ProposalReminderScheduler {

    private static final int REMINDER_AFTER_DAYS  = 10;  // send reminder 10 days after creation
    private static final int OVERDUE_AFTER_DAYS   = 7;   // mark overdue 7 days after reminder

    private final ProposalRepository    proposalRepository;
    private final EmailService          emailService;
    private final NotificationService   notificationService;
    private final UserRepository        userRepository;

    /**
     * Runs every hour.
     * Checks all PENDING proposals and:
     *   1. Sends reminder email if 10 days passed and reminder not yet sent.
     *   2. Marks OVERDUE if 7 days passed since reminder was sent.
     *
     * To test faster, change fixedRate to a smaller value (e.g. 60_000 for 1 min).
     */
    @Scheduled(fixedRate = 3_600_000)   // every 1 hour (3 600 000 ms)
    public void processProposalRemindersAndOverdue() {
        LocalDateTime now = LocalDateTime.now();

        // Only PENDING proposals need automation; OVERDUE proposals are handled separately below
        List<Proposal> pendingProposals = proposalRepository.findByStatus(ProposalStatus.PENDING);

        for (Proposal proposal : pendingProposals) {
            try {
                processProposal(proposal, now);
            } catch (Exception e) {
                System.err.println("[ProposalReminderScheduler] Error processing proposal "
                        + proposal.getId() + ": " + e.getMessage());
            }
        }

        // Also check OVERDUE proposals — they might need to be marked overdue if
        // somehow they already went through the reminder step
        List<Proposal> overdueProposals = proposalRepository.findByStatus(ProposalStatus.OVERDUE);
        // (Nothing to do for OVERDUE — they stay OVERDUE until client acts)
        // This block is intentionally empty; kept for future extensibility.
    }

    /**
     * Core logic per proposal:
     *   Step 1 — Has reminder been sent? No → check if 10 days have passed.
     *   Step 2 — Reminder sent? Yes → check if 7 more days have passed → OVERDUE.
     */
    private void processProposal(Proposal proposal, LocalDateTime now) {
        LocalDateTime createdAt = proposal.getCreatedAt();
        if (createdAt == null) {
            return; // Safety guard — should never happen
        }

        LocalDateTime reminderSentAt = proposal.getReminderEmailSentAt();

        // ── STEP 2 first: if reminder already sent, check for overdue ──────────────
        if (reminderSentAt != null) {
            LocalDateTime overdueAt = reminderSentAt.plusDays(OVERDUE_AFTER_DAYS);
            if (!now.isBefore(overdueAt)) {
                // 7 days have elapsed since reminder → mark OVERDUE
                proposal.setStatus(ProposalStatus.OVERDUE);
                proposal.setUpdatedAt(now);
                proposalRepository.save(proposal);
                System.out.println("[ProposalReminderScheduler] Proposal " + proposal.getId()
                        + " marked OVERDUE (reminder sent at " + reminderSentAt + ")");
                sendOverdueNotifications(proposal);
            }
            // Whether or not we just marked OVERDUE, do NOT send another reminder
            return;
        }

        // ── STEP 1: reminder not yet sent — check if 10 days have passed ──────────
        LocalDateTime reminderTriggerAt = createdAt.plusDays(REMINDER_AFTER_DAYS);
        if (now.isBefore(reminderTriggerAt)) {
            return; // Not yet 10 days — nothing to do
        }

        // 10 days have passed and reminder not yet sent → send it
        boolean emailSent = sendReminderEmail(proposal);
        if (emailSent) {
            proposal.setReminderEmailSentAt(now);
            proposal.setUpdatedAt(now);
            proposalRepository.save(proposal);
            System.out.println("[ProposalReminderScheduler] Reminder email sent for proposal "
                    + proposal.getId() + " (created at " + createdAt + ")");
            sendReminderNotification(proposal);
        }
    }

    // ── Email helpers ─────────────────────────────────────────────────────────────

    private boolean sendReminderEmail(Proposal proposal) {
        try {
            Optional<User> clientOpt = userRepository.findById(proposal.getClientId());
            if (clientOpt.isEmpty()) {
                System.err.println("[ProposalReminderScheduler] Client not found for proposal "
                        + proposal.getId());
                return false;
            }

            String clientEmail = clientOpt.get().getEmail();
            String subject = "Reminder: Proposal Awaiting Your Response";
            String body = "Dear " + proposal.getClientName() + ",\n\n"
                    + "This is a friendly reminder that the proposal titled \""
                    + proposal.getTitle()
                    + "\" is still awaiting your response.\n\n"
                    + "Please log in to the portal and accept or reject the proposal at your earliest convenience.\n\n"
                    + "If we do not receive a response within 7 days, the proposal will be marked as Overdue.\n\n"
                    + "Best regards,\nCRMS Team";

            emailService.sendEmail(clientEmail, subject, body);
            return true;
        } catch (Exception e) {
            System.err.println("[ProposalReminderScheduler] Failed to send reminder email for proposal "
                    + proposal.getId() + ": " + e.getMessage());
            return false;
        }
    }

    private void sendReminderNotification(Proposal proposal) {
        try {
            notificationService.createNotification(
                    proposal.getClientId(),
                    "Proposal Reminder",
                    "Your proposal \"" + proposal.getTitle() + "\" is awaiting your response.",
                    NotificationType.NEW_PROPOSAL,
                    proposal.getId(),
                    "PROPOSAL"
            );
        } catch (Exception e) {
            System.err.println("[ProposalReminderScheduler] Failed to send reminder notification: "
                    + e.getMessage());
        }
    }

    private void sendOverdueNotifications(Proposal proposal) {
        // Notify client
        try {
            notificationService.createNotification(
                    proposal.getClientId(),
                    "Proposal Overdue",
                    "The proposal \"" + proposal.getTitle() + "\" has been marked as Overdue due to no response.",
                    NotificationType.NEW_PROPOSAL,
                    proposal.getId(),
                    "PROPOSAL"
            );
        } catch (Exception e) {
            System.err.println("[ProposalReminderScheduler] Failed to send overdue notification to client: "
                    + e.getMessage());
        }

        // Notify company
        try {
            notificationService.createNotification(
                    proposal.getCompanyId(),
                    "Proposal Overdue",
                    "The proposal \"" + proposal.getTitle() + "\" has been marked as Overdue — client has not responded.",
                    NotificationType.NEW_PROPOSAL,
                    proposal.getId(),
                    "PROPOSAL"
            );
        } catch (Exception e) {
            System.err.println("[ProposalReminderScheduler] Failed to send overdue notification to company: "
                    + e.getMessage());
        }

        // Email company
        try {
            Optional<User> companyOpt = userRepository.findById(proposal.getCompanyId());
            companyOpt.ifPresent(company -> emailService.sendEmail(
                    company.getEmail(),
                    "Proposal Marked as Overdue",
                    "The proposal \"" + proposal.getTitle()
                            + "\" has been marked as Overdue because the client did not respond within the deadline."
            ));
        } catch (Exception e) {
            System.err.println("[ProposalReminderScheduler] Failed to send overdue email to company: "
                    + e.getMessage());
        }
    }
}
