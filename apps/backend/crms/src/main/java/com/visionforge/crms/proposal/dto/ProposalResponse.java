package com.visionforge.crms.proposal.dto;

import com.visionforge.crms.proposal.model.ProposalStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposalResponse {
    private String id;
    private String title;
    private String description;
    private String clientId;
    private String clientName;
    private Double totalBudget;
    private Integer totalDurationDays;
    private List<Map<String, Object>> budgetData;
    private List<Map<String, Object>> timelines;
    private String companyId;
    private ProposalStatus status;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime reminderEmailSentAt;
}
