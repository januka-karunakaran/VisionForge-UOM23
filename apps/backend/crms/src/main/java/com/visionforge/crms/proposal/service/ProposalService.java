package com.visionforge.crms.proposal.service;

import com.visionforge.crms.email.EmailService;
import com.visionforge.crms.notification.model.NotificationType;
import com.visionforge.crms.notification.service.NotificationService;
import com.visionforge.crms.project.service.ProjectService;
import com.visionforge.crms.proposal.dto.CreateProposalRequest;
import com.visionforge.crms.proposal.dto.ProposalDecisionRequest;
import com.visionforge.crms.proposal.dto.ProposalResponse;
import com.visionforge.crms.proposal.model.Proposal;
import com.visionforge.crms.proposal.model.ProposalStatus;
import com.visionforge.crms.proposal.repository.ProposalRepository;
import com.visionforge.crms.user.CurrentUserService;
import com.visionforge.crms.user.Role;
import com.visionforge.crms.user.User;
import com.visionforge.crms.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProposalService {

    private final ProposalRepository proposalRepository;
    private final CurrentUserService currentUserService;
    private final ProjectService projectService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final UserRepository userRepository;

    // Company create proposal
    public ProposalResponse createProposal(CreateProposalRequest request, String companyId) {
        Proposal proposal = Proposal.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .clientId(request.getClientId())
                .clientName(request.getClientName())
                .totalBudget(request.getTotalBudget())
                .totalDurationDays(request.getTotalDurationDays())
                .budgetData(request.getBudgetData())
                .timelines(request.getTimelines())
                .companyId(companyId)
                .status(ProposalStatus.PENDING)
                .rejectionReason(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Proposal savedProposal = proposalRepository.save(proposal);

        notifyClientNewProposal(savedProposal);

        return mapToResponse(savedProposal);
    }

    // Company proposals
    public List<ProposalResponse> getProposalsByCompany(String companyId) {
        return proposalRepository.findByCompanyId(companyId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Client proposals - JWT based
    public List<ProposalResponse> getCurrentClientProposals() {
        if (currentUserService.getCurrentUserRole() != Role.CLIENT) {
            throw new RuntimeException("Only client can access client proposals");
        }

        String clientId = currentUserService.getCurrentUserId();

        return proposalRepository.findByClientId(clientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Single proposal detail for logged-in client only
    public ProposalResponse getCurrentClientProposalById(String proposalId) {
        if (currentUserService.getCurrentUserRole() != Role.CLIENT) {
            throw new RuntimeException("Only client can view proposal details");
        }

        String clientId = currentUserService.getCurrentUserId();

        Proposal proposal = proposalRepository.findByIdAndClientId(proposalId, clientId)
                .orElseThrow(() -> new RuntimeException("Proposal not found for this client"));

        return mapToResponse(proposal);
    }

    // Accept proposal
    public ProposalResponse acceptCurrentClientProposal(String proposalId) {
        if (currentUserService.getCurrentUserRole() != Role.CLIENT) {
            throw new RuntimeException("Only client can accept proposal");
        }

        String clientId = currentUserService.getCurrentUserId();

        Proposal proposal = proposalRepository.findByIdAndClientId(proposalId, clientId)
                .orElseThrow(() -> new RuntimeException("Proposal not found for this client"));

        if (proposal.getStatus() != ProposalStatus.PENDING
                && proposal.getStatus() != ProposalStatus.OVERDUE) {
            throw new RuntimeException("Only pending or overdue proposals can be accepted");
        }

        proposal.setStatus(ProposalStatus.ACCEPTED);
        proposal.setRejectionReason(null);
        proposal.setUpdatedAt(LocalDateTime.now());

        Proposal savedProposal = proposalRepository.save(proposal);

        projectService.createProjectFromProposal(savedProposal);

        notifyCompanyProposalAccepted(savedProposal);

        return mapToResponse(savedProposal);
    }

    // Reject proposal
    public ProposalResponse rejectCurrentClientProposal(String proposalId, ProposalDecisionRequest request) {
        if (currentUserService.getCurrentUserRole() != Role.CLIENT) {
            throw new RuntimeException("Only client can reject proposal");
        }

        String clientId = currentUserService.getCurrentUserId();

        Proposal proposal = proposalRepository.findByIdAndClientId(proposalId, clientId)
                .orElseThrow(() -> new RuntimeException("Proposal not found for this client"));

        if (proposal.getStatus() != ProposalStatus.PENDING
                && proposal.getStatus() != ProposalStatus.OVERDUE) {
            throw new RuntimeException("Only pending or overdue proposals can be rejected");
        }

        String reason = request.getRejectionReason() == null || request.getRejectionReason().isBlank()
                ? "No reason provided"
                : request.getRejectionReason();

        proposal.setStatus(ProposalStatus.REJECTED);
        proposal.setRejectionReason(reason);
        proposal.setUpdatedAt(LocalDateTime.now());

        Proposal savedProposal = proposalRepository.save(proposal);

        notifyCompanyProposalRejected(savedProposal);

        return mapToResponse(savedProposal);
    }

    private void notifyClientNewProposal(Proposal proposal) {
        try {
            notificationService.createNotification(
                    proposal.getClientId(),
                    "New Proposal Received",
                    "A new project proposal has been sent to you.",
                    NotificationType.NEW_PROPOSAL,
                    proposal.getId(),
                    "PROPOSAL"
            );
        } catch (Exception e) {
            System.err.println("Failed to send proposal notification: " + e.getMessage());
        }

        try {
            User client = userRepository.findById(proposal.getClientId())
                    .orElseThrow(() -> new RuntimeException("Client not found"));

            emailService.sendEmail(
                    client.getEmail(),
                    "New Proposal Received",
                    "You have received a new project proposal. Please log in to review it."
            );
        } catch (Exception e) {
            System.err.println("Failed to send proposal email: " + e.getMessage());
        }
    }

    private void notifyCompanyProposalAccepted(Proposal proposal) {
        try {
            notificationService.createNotification(
                    proposal.getCompanyId(),
                    "Proposal Accepted",
                    "Your proposal has been accepted by the client. A project has been created.",
                    NotificationType.PROPOSAL_ACCEPTED,
                    proposal.getId(),
                    "PROPOSAL"
            );
        } catch (Exception e) {
            System.err.println("Failed to send proposal acceptance notification to company: " + e.getMessage());
        }

        try {
            User company = userRepository.findById(proposal.getCompanyId())
                    .orElseThrow(() -> new RuntimeException("Company user not found"));

            emailService.sendEmail(
                    company.getEmail(),
                    "Proposal Accepted",
                    "Your proposal has been accepted by the client. A project has been created."
            );
        } catch (Exception e) {
            System.err.println("Failed to send proposal acceptance email to company: " + e.getMessage());
        }
    }

    private void notifyCompanyProposalRejected(Proposal proposal) {
        String reason = proposal.getRejectionReason() == null || proposal.getRejectionReason().isBlank()
                ? "No reason provided"
                : proposal.getRejectionReason();

        try {
            notificationService.createNotification(
                    proposal.getCompanyId(),
                    "Proposal Rejected",
                    "Your proposal has been rejected by the client. Reason: " + reason,
                    NotificationType.PROPOSAL_REJECTED,
                    proposal.getId(),
                    "PROPOSAL"
            );
        } catch (Exception e) {
            System.err.println("Failed to send proposal rejection notification to company: " + e.getMessage());
        }

        try {
            User company = userRepository.findById(proposal.getCompanyId())
                    .orElseThrow(() -> new RuntimeException("Company user not found"));

            emailService.sendEmail(
                    company.getEmail(),
                    "Proposal Rejected",
                    "Your proposal has been rejected by the client.\nReason: " + reason
            );
        } catch (Exception e) {
            System.err.println("Failed to send proposal rejection email to company: " + e.getMessage());
        }
    }

    private ProposalResponse mapToResponse(Proposal proposal) {
        return ProposalResponse.builder()
                .id(proposal.getId())
                .title(proposal.getTitle())
                .description(proposal.getDescription())
                .clientId(proposal.getClientId())
                .clientName(proposal.getClientName())
                .totalBudget(proposal.getTotalBudget())
                .totalDurationDays(proposal.getTotalDurationDays())
                .budgetData(proposal.getBudgetData())
                .timelines(proposal.getTimelines())
                .companyId(proposal.getCompanyId())
                .status(proposal.getStatus())
                .rejectionReason(proposal.getRejectionReason())
                .createdAt(proposal.getCreatedAt())
                .updatedAt(proposal.getUpdatedAt())
                .reminderEmailSentAt(proposal.getReminderEmailSentAt())
                .build();
    }
}
