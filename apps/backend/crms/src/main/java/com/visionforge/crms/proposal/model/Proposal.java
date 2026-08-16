package com.visionforge.crms.proposal.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "proposals")
public class Proposal {

    @Id
    private String id;

    private String title;
    private String description;

    private String clientId;
    private String clientName;
    private String companyId;

    private Double totalBudget;
    private Integer totalDurationDays;
    private List<Map<String, Object>> budgetData;
    private List<Map<String, Object>> timelines;

    private ProposalStatus status;
    private String rejectionReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Reminder automation fields
    private LocalDateTime reminderEmailSentAt;  // null = reminder not yet sent
}
