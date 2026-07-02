package com.visionforge.crms.config;

import com.visionforge.crms.project.service.ProjectService;
import com.visionforge.crms.proposal.model.ProposalStatus;
import com.visionforge.crms.proposal.repository.ProposalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AcceptedProposalProjectBackfillRunner implements CommandLineRunner {

    private final ProposalRepository proposalRepository;
    private final ProjectService projectService;

    @Override
    public void run(String... args) {
        try {
            var acceptedProposals = proposalRepository.findByStatus(ProposalStatus.ACCEPTED);
            log.info("Backfilling projects for {} accepted proposals", acceptedProposals.size());

            acceptedProposals.forEach(proposal -> {
                projectService.ensureProjectExistsForProposal(proposal);
                log.info("Ensured project exists for accepted proposal {}", proposal.getId());
            });
        } catch (DataAccessException ex) {
            log.warn("Skipping accepted proposal project backfill because MongoDB is unavailable", ex);
        }
    }
}