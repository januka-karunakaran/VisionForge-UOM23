package com.visionforge.crms.kanban.service;

import com.mongodb.client.gridfs.model.GridFSFile;
import com.visionforge.crms.kanban.dto.*;
import com.visionforge.crms.kanban.model.*;
import com.visionforge.crms.kanban.repository.KanbanBoardRepository;
import com.visionforge.crms.kanban.repository.KanbanTaskRepository;
import com.visionforge.crms.notification.model.NotificationType;
import com.visionforge.crms.notification.service.NotificationService;
import com.visionforge.crms.project.model.Project;
import com.visionforge.crms.project.repository.ProjectRepository;
import com.visionforge.crms.user.CurrentUserService;
import com.visionforge.crms.user.Role;
import com.visionforge.crms.user.User;
import com.visionforge.crms.user.UserRepository;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.core.io.Resource;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class KanbanService {

    private final KanbanBoardRepository kanbanBoardRepository;
    private final KanbanTaskRepository kanbanTaskRepository;
    private final GridFsTemplate gridFsTemplate;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final NotificationService notificationService;

    public KanbanService(KanbanBoardRepository kanbanBoardRepository,
                         KanbanTaskRepository kanbanTaskRepository,
                         GridFsTemplate gridFsTemplate,
                         CurrentUserService currentUserService,
                         UserRepository userRepository,
                         ProjectRepository projectRepository,
                         NotificationService notificationService) {
        this.kanbanBoardRepository = kanbanBoardRepository;
        this.kanbanTaskRepository = kanbanTaskRepository;
        this.gridFsTemplate = gridFsTemplate;
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.notificationService = notificationService;
    }

    public KanbanBoardResponse getClientProjectKanbanBoard(String projectId) {
        if (currentUserService.getCurrentUserRole() != Role.CLIENT) {
            throw new RuntimeException("Only client can view client kanban board");
        }

        String clientId = currentUserService.getCurrentUserId();

        Project project = projectRepository.findByIdAndClientId(projectId, clientId)
                .orElseThrow(() -> new RuntimeException("Project not found for this client"));

        KanbanBoard board = kanbanBoardRepository.findByProjectId(project.getId())
                .orElseThrow(() -> new RuntimeException("Kanban board not found for this project"));

        List<KanbanTask> tasks = kanbanTaskRepository.findByProjectId(project.getId());

        return mapToResponse(board, tasks);
    }

    public List<KanbanAssigneeDto> getCompanyAssignees() {
        return userRepository.findAll()
                .stream()
                .filter(user -> user.getRole() == Role.COMPANY && user.isEmailVerified())
                .map(user -> new KanbanAssigneeDto(
                        user.getId(),
                        user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getEmail(),
                        user.getEmail()
                ))
                .toList();
    }

    public List<KanbanProjectDto> getAssignedProjectsForCurrentUser() {
        User currentUser = currentUserService.getCurrentUser();
        Map<String, KanbanProjectDto> projectsById = new LinkedHashMap<>();

        kanbanTaskRepository.findByAssignedTo(currentUser.getId()).forEach(task -> {
            String projectId = task.getProjectId();

            if (projectId == null || projectId.isBlank() || projectsById.containsKey(projectId)) {
                return;
            }

            String projectName = projectRepository.findById(projectId)
                    .map(Project::getName)
                    .filter(name -> name != null && !name.isBlank())
                    .orElseGet(() -> kanbanBoardRepository.findByProjectId(projectId)
                            .map(KanbanBoard::getTitle)
                            .filter(title -> title != null && !title.isBlank())
                            .orElse("Kanban Board"));

            projectsById.put(projectId, new KanbanProjectDto(
                    projectId,
                    projectName,
                    "Assigned Kanban board"
            ));
        });

        return new ArrayList<>(projectsById.values());
    }

    public KanbanBoard getBoardByProjectId(String projectId) {
        return createBoardForProject(projectId);
    }

    public KanbanBoard touchBoard(String projectId, String title) {
        KanbanBoard board = createBoardForProject(projectId);
        LocalDateTime now = LocalDateTime.now();

        if (title != null && !title.isBlank()) {
            board.setTitle(title);
        }

        if (board.getCreatedAt() == null) {
            board.setCreatedAt(now);
        }

        board.setUpdatedAt(now);
        KanbanBoard savedBoard = kanbanBoardRepository.save(board);
        touchProject(projectId);
        return savedBoard;
    }

    public List<KanbanTask> getTasksByProjectId(String projectId) {
        return kanbanTaskRepository.findByProjectId(projectId);
    }

    public KanbanTask createTask(String projectId, CreateTaskRequestDto dto) {
        KanbanBoard board = createBoardForProject(projectId);

        KanbanTask task = new KanbanTask();
        task.setBoardId(board.getId());
        task.setProjectId(projectId);
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setStatus(dto.getStatus());
        task.setDueDate(dto.getDueDate());
        task.setPriority(dto.getPriority());
        task.setAssignedTo(dto.getAssignedTo());
        task.setComments(new ArrayList<>());
        task.setAttachments(new ArrayList<>());

        KanbanTask savedTask = kanbanTaskRepository.save(task);
        touchBoard(projectId, board.getTitle());

        // Notify the assignee if one was set
        if (dto.getAssignedTo() != null && !dto.getAssignedTo().isBlank()) {
            notifyTaskAssigned(savedTask, dto.getAssignedTo());
        }

        return savedTask;
    }

    public KanbanTask updateTask(String projectId, String taskId, CreateTaskRequestDto dto) {
        KanbanTask task = kanbanTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!projectId.equals(task.getProjectId())) {
            throw new RuntimeException("Task does not belong to the provided project");
        }

        String previousAssignee = task.getAssignedTo();

        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setStatus(dto.getStatus());
        task.setDueDate(dto.getDueDate());
        task.setPriority(dto.getPriority());
        task.setAssignedTo(dto.getAssignedTo());

        KanbanTask savedTask = kanbanTaskRepository.save(task);
        touchProject(projectId);

        // Notify new assignee only if the assignee actually changed
        String newAssignee = dto.getAssignedTo();
        boolean assigneeChanged = newAssignee != null
                && !newAssignee.isBlank()
                && !newAssignee.equals(previousAssignee);
        if (assigneeChanged) {
            notifyTaskAssigned(savedTask, newAssignee);
        }

        return savedTask;
    }

    public KanbanTask updateTaskStatus(String taskId, UpdateTaskStatusDto dto) {
        KanbanTask task = kanbanTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        task.setStatus(dto.getStatus());
        KanbanTask savedTask = kanbanTaskRepository.save(task);
        touchProject(task.getProjectId());
        return savedTask;
    }

    public KanbanTask addComment(String projectId, String taskId, String commentText) {
        KanbanTask task = kanbanTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!projectId.equals(task.getProjectId())) {
            throw new RuntimeException("Task does not belong to the provided project");
        }

        String normalizedComment = commentText == null ? "" : commentText.trim();

        if (normalizedComment.isBlank()) {
            throw new RuntimeException("Comment is required");
        }

        User currentUser = currentUserService.getCurrentUser();

        List<KanbanComment> comments = task.getComments() != null
                ? new ArrayList<>(task.getComments())
                : new ArrayList<>();

        comments.add(new KanbanComment(
                UUID.randomUUID().toString(),
                currentUser.getId(),
                currentUser.getName() != null && !currentUser.getName().isBlank()
                        ? currentUser.getName()
                        : currentUser.getEmail(),
                normalizedComment,
                Instant.now()
        ));

        task.setComments(comments);
        KanbanTask savedTask = kanbanTaskRepository.save(task);
        touchProject(projectId);
        return savedTask;
    }

    public KanbanTask uploadAttachments(String projectId, String taskId, MultipartFile[] files) throws IOException {
        KanbanTask task = kanbanTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!projectId.equals(task.getProjectId())) {
            throw new RuntimeException("Task does not belong to the provided project");
        }

        List<KanbanAttachment> attachments = task.getAttachments() != null
                ? new ArrayList<>(task.getAttachments())
                : new ArrayList<>();

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;

            String originalFileName = file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank()
                    ? file.getOriginalFilename()
                    : "attachment";

            ObjectId gridFsId = storeAttachmentInMongo(projectId, taskId, originalFileName, file);

            attachments.add(new KanbanAttachment(
                    gridFsId.toHexString(),
                    originalFileName,
                    file.getContentType(),
                    file.getSize(),
                    Instant.now()
            ));
        }

        task.setAttachments(attachments);
        KanbanTask savedTask = kanbanTaskRepository.save(task);
        touchProject(projectId);
        return savedTask;
    }

    public void deleteTask(String projectId, String taskId) {
        KanbanTask task = kanbanTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!projectId.equals(task.getProjectId())) {
            throw new RuntimeException("Task does not belong to the provided project");
        }

        if (task.getAttachments() != null) {
            task.getAttachments().forEach(attachment ->
                    deleteGridFsAttachmentIfPresent(attachment.getFileId())
            );
        }

        kanbanTaskRepository.delete(task);
        touchProject(projectId);
    }

    public KanbanAttachment getAttachmentMetadata(String projectId, String taskId, String attachmentId) {
        KanbanTask task = kanbanTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!projectId.equals(task.getProjectId())) {
            throw new RuntimeException("Task does not belong to the provided project");
        }

        return (task.getAttachments() == null ? List.<KanbanAttachment>of() : task.getAttachments())
                .stream()
                .filter(attachment -> attachmentId.equals(attachment.getFileId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Attachment not found"));
    }

    public Resource getAttachmentResource(String projectId, String taskId, KanbanAttachment attachment) {
        Resource gridFsResource = getGridFsResourceIfPresent(attachment.getFileId());

        if (gridFsResource != null) {
            return gridFsResource;
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Stored attachment not found");
    }

    public KanbanBoard createBoardForProject(String projectId) {
        return kanbanBoardRepository.findByProjectId(projectId)
                .orElseGet(() -> {
                    LocalDateTime now = LocalDateTime.now();
                    KanbanBoard board = new KanbanBoard();
                    board.setProjectId(projectId);
                    board.setTitle("Project Kanban Board");
                    board.setCreatedAt(now);
                    board.setUpdatedAt(now);
                    return kanbanBoardRepository.save(board);
                });
    }

    private void touchProject(String projectId) {
        if (projectId == null || projectId.isBlank()) {
            return;
        }

        projectRepository.findById(projectId).ifPresent(project -> {
            project.setUpdatedAt(LocalDateTime.now());
            projectRepository.save(project);
        });

        kanbanBoardRepository.findByProjectId(projectId).ifPresent(board -> {
            LocalDateTime now = LocalDateTime.now();
            if (board.getCreatedAt() == null) {
                board.setCreatedAt(now);
            }
            board.setUpdatedAt(now);
            kanbanBoardRepository.save(board);
        });
    }

    /**
     * Sends a TASK_ASSIGNED notification to the specified assignee.
     * Includes project name, project ID, and task name in the message.
     */
    private void notifyTaskAssigned(KanbanTask task, String assigneeId) {
        try {
            String projectId   = task.getProjectId();
            String taskName    = task.getTitle() != null ? task.getTitle() : "Unnamed Task";

            // Resolve project name from ProjectRepository
            String projectName = projectRepository.findById(projectId)
                    .map(Project::getName)
                    .filter(name -> name != null && !name.isBlank())
                    .orElse("Your project");

            String title   = "New Task Assigned";
            String message = "You have been assigned a new task in " + projectName + ".\n"
                    + "Project: " + projectName + "\n"
                    + "Project ID: " + projectId + "\n"
                    + "Task: " + taskName;

            notificationService.createNotification(
                    assigneeId,
                    title,
                    message,
                    NotificationType.TASK_ASSIGNED,
                    task.getId(),
                    "TASK"
            );
        } catch (Exception e) {
            System.err.println("[KanbanService] Failed to send task assignment notification: " + e.getMessage());
        }
    }

    private KanbanBoardResponse mapToResponse(KanbanBoard board, List<KanbanTask> tasks) {
        Map<String, List<KanbanTask>> tasksByStatus = new LinkedHashMap<>();

        for (KanbanTask task : tasks) {
            String status = task.getStatus() == null || task.getStatus().isBlank()
                    ? "TODO"
                    : task.getStatus();

            tasksByStatus.computeIfAbsent(status, key -> new ArrayList<>()).add(task);
        }

        List<KanbanColumnResponse> columns = tasksByStatus.entrySet()
                .stream()
                .map(entry -> KanbanColumnResponse.builder()
                        .id(entry.getKey())
                        .title(entry.getKey())
                        .tasks(entry.getValue().stream().map(this::mapTask).toList())
                        .build())
                .toList();

        return KanbanBoardResponse.builder()
                .id(board.getId())
                .projectId(board.getProjectId())
                .clientId(board.getClientId())
                .companyId(board.getCompanyId())
                .columns(columns)
                .build();
    }

    private KanbanTaskResponse mapTask(KanbanTask task) {
        return KanbanTaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .priority(task.getPriority())
                .assignedTo(task.getAssignedTo())
                .build();
    }

    private void deleteGridFsAttachmentIfPresent(String attachmentId) {
        if (attachmentId == null || attachmentId.isBlank()) return;

        try {
            gridFsTemplate.delete(new Query(Criteria.where("_id").is(new ObjectId(attachmentId))));
        } catch (IllegalArgumentException ignored) {
        }
    }

    private Resource getGridFsResourceIfPresent(String attachmentId) {
        if (attachmentId == null || attachmentId.isBlank() || !ObjectId.isValid(attachmentId)) {
            return null;
        }

        GridFSFile gridFile = gridFsTemplate.findOne(
                new Query(Criteria.where("_id").is(new ObjectId(attachmentId)))
        );

        if (gridFile == null) return null;

        return gridFsTemplate.getResource(gridFile);
    }

    private ObjectId storeAttachmentInMongo(String projectId,
                                            String taskId,
                                            String originalFileName,
                                            MultipartFile file) throws IOException {
        Document metadata = new Document()
                .append("projectId", projectId)
                .append("taskId", taskId)
                .append("uploadedAt", Instant.now().toString());

        try (InputStream inputStream = file.getInputStream()) {
            return gridFsTemplate.store(
                    inputStream,
                    originalFileName,
                    file.getContentType(),
                    metadata
            );
        }
    }
}
