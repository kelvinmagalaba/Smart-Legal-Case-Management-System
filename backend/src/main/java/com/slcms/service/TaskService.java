package com.slcms.service;

import com.slcms.model.Deadline;
import com.slcms.model.Task;
import com.slcms.model.TaskHistory;
import com.slcms.model.TaskStatus;
import com.slcms.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class TaskService {

    private final TaskRepository taskRepository;

    @Autowired
    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public List<Task> getAllTasks() {
        List<Task> tasks = taskRepository.findAllTasks();
        tasks.sort((a, b) -> {
            if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });
        return tasks;
    }

    public Optional<Task> getTaskById(String id) {
        return taskRepository.findTaskById(id);
    }

    public Task createTask(Task task, String creatorId, String creatorName) {
        if (task.getId() == null || task.getId().isBlank()) {
            task.setId("tsk-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4));
        }
        task.setStatus(TaskStatus.TO_DO);
        task.setCreatedBy(creatorId);
        task.setCreatedByName(creatorName);
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());
        
        Task saved = taskRepository.saveTask(task);

        taskRepository.addHistory(TaskHistory.builder()
                .id("th-" + System.currentTimeMillis())
                .taskId(saved.getId())
                .previousStatus(null)
                .newStatus(TaskStatus.TO_DO)
                .changedBy(creatorId)
                .changedByName(creatorName)
                .changeReason("Task created and assigned")
                .changedAt(LocalDateTime.now())
                .build());

        return saved;
    }

    public Task transitionTask(String taskId, String action, String feedback, String userId, String userName, String userRole) {
        Task task = taskRepository.findTaskById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        TaskStatus prev = task.getStatus();
        TaskStatus next = prev;
        String reason = "";

        // Strictly enforce role-based rules:
        // Administrator cannot approve legal work or mark work as reviewed
        boolean isAdmin = "Administrator".equalsIgnoreCase(userRole) || "System Administrator".equalsIgnoreCase(userRole);

        if ("start".equalsIgnoreCase(action)) {
            if (isAdmin) throw new IllegalStateException("Administrator cannot start lawyer task. Only assigned practitioner may start.");
            if (prev != TaskStatus.TO_DO) throw new IllegalStateException("Task must be in TO_DO to start");
            next = TaskStatus.IN_PROGRESS;
            reason = "Work started by assignee";
        } else if ("submit_review".equalsIgnoreCase(action)) {
            if (isAdmin) throw new IllegalStateException("Administrator cannot submit lawyer work for review.");
            if (prev != TaskStatus.IN_PROGRESS) throw new IllegalStateException("Task must be IN_PROGRESS to submit for review");
            next = TaskStatus.UNDER_REVIEW;
            reason = "Work submitted for supervising lawyer review";
        } else if ("approve".equalsIgnoreCase(action)) {
            if (isAdmin) throw new IllegalStateException("Administrator cannot approve legal submissions. Only Senior Lawyer / Supervisor may approve.");
            if (prev != TaskStatus.UNDER_REVIEW) throw new IllegalStateException("Task must be UNDER_REVIEW to approve");
            next = TaskStatus.COMPLETED;
            task.setCompletedAt(LocalDateTime.now());
            reason = (feedback != null && !feedback.isBlank()) ? "Approved: " + feedback : "Legal work approved by supervising lawyer";
        } else if ("return".equalsIgnoreCase(action)) {
            if (isAdmin) throw new IllegalStateException("Administrator cannot review/return legal work.");
            if (prev != TaskStatus.UNDER_REVIEW) throw new IllegalStateException("Task must be UNDER_REVIEW to return");
            next = TaskStatus.IN_PROGRESS;
            task.setReviewFeedback(feedback);
            reason = (feedback != null && !feedback.isBlank()) ? "Returned for revision: " + feedback : "Returned for revision by supervisor";
        } else if ("reopen".equalsIgnoreCase(action)) {
            if (prev != TaskStatus.COMPLETED) throw new IllegalStateException("Task must be COMPLETED to reopen");
            next = TaskStatus.IN_PROGRESS;
            task.setCompletedAt(null);
            reason = (feedback != null && !feedback.isBlank()) ? "Reopened: " + feedback : "Reopened by supervising counsel";
        } else if ("cancel".equalsIgnoreCase(action)) {
            next = TaskStatus.CANCELLED;
            task.setCancellationReason(feedback);
            reason = (feedback != null && !feedback.isBlank()) ? "Cancelled: " + feedback : "Task cancelled with administrative reason";
        } else {
            throw new IllegalArgumentException("Unsupported action: " + action);
        }

        task.setStatus(next);
        task.setUpdatedAt(LocalDateTime.now());
        Task updated = taskRepository.saveTask(task);

        taskRepository.addHistory(TaskHistory.builder()
                .id("th-" + System.currentTimeMillis())
                .taskId(taskId)
                .previousStatus(prev)
                .newStatus(next)
                .changedBy(userId)
                .changedByName(userName)
                .changeReason(reason)
                .changedAt(LocalDateTime.now())
                .build());

        return updated;
    }

    public Task reassignTask(String taskId, String newAssigneeId, String newAssigneeName, String newAssigneeAvatar, String reason, String actorId, String actorName) {
        Task task = taskRepository.findTaskById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        String oldAssignee = task.getAssignedToName();
        task.setAssignedTo(newAssigneeId);
        task.setAssignedToName(newAssigneeName);
        task.setAssignedToAvatar(newAssigneeAvatar);
        task.setUpdatedAt(LocalDateTime.now());
        Task updated = taskRepository.saveTask(task);

        taskRepository.addHistory(TaskHistory.builder()
                .id("th-" + System.currentTimeMillis())
                .taskId(taskId)
                .previousStatus(task.getStatus())
                .newStatus(task.getStatus())
                .changedBy(actorId)
                .changedByName(actorName)
                .changeReason("Reassigned from " + oldAssignee + " to " + newAssigneeName + (reason != null && !reason.isBlank() ? " (" + reason + ")" : ""))
                .changedAt(LocalDateTime.now())
                .build());

        return updated;
    }

    public List<TaskHistory> getTaskHistory(String taskId) {
        return taskRepository.findHistoryByTaskId(taskId);
    }

    public List<Deadline> getAllDeadlines() {
        List<Deadline> deadlines = taskRepository.findAllDeadlines();
        deadlines.sort((a, b) -> {
            if (a.getDeadlineAt() == null || b.getDeadlineAt() == null) return 0;
            return a.getDeadlineAt().compareTo(b.getDeadlineAt());
        });
        return deadlines;
    }

    public Deadline createDeadline(Deadline deadline, String creatorId) {
        if (deadline.getId() == null || deadline.getId().isBlank()) {
            deadline.setId("dln-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4));
        }
        deadline.setCreatedBy(creatorId);
        deadline.setCreatedAt(LocalDateTime.now());
        deadline.setUpdatedAt(LocalDateTime.now());
        return taskRepository.saveDeadline(deadline);
    }

    public Deadline updateDeadline(String id, Deadline updated, String reason, String actorId) {
        Deadline existing = taskRepository.findDeadlineById(id)
                .orElseThrow(() -> new IllegalArgumentException("Deadline not found: " + id));

        existing.setPreviousDeadlineAt(existing.getDeadlineAt());
        existing.setTitle(updated.getTitle());
        existing.setType(updated.getType());
        existing.setDeadlineAt(updated.getDeadlineAt());
        existing.setDeadlineDateString(updated.getDeadlineDateString());
        existing.setCourt(updated.getCourt());
        existing.setRegistry(updated.getRegistry());
        existing.setResponsibleLawyerId(updated.getResponsibleLawyerId());
        existing.setResponsibleLawyerName(updated.getResponsibleLawyerName());
        existing.setSource(updated.getSource());
        existing.setStatutoryReference(updated.getStatutoryReference());
        existing.setChangeReason(reason);
        existing.setUpdatedAt(LocalDateTime.now());

        return taskRepository.saveDeadline(existing);
    }
}
