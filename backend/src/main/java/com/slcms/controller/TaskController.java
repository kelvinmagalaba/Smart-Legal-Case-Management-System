package com.slcms.controller;

import com.slcms.model.Deadline;
import com.slcms.model.Task;
import com.slcms.model.TaskHistory;
import com.slcms.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(originPatterns = "*")
public class TaskController {

    private final TaskService taskService;

    @Autowired
    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<Task>> getAllTasks() {
        return ResponseEntity.ok(taskService.getAllTasks());
    }

    @GetMapping("/tasks/{id}")
    public ResponseEntity<?> getTaskById(@PathVariable String id) {
        return taskService.getTaskById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tasks")
    public ResponseEntity<?> createTask(
            @RequestBody Task task,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Name", required = false) String userName) {
        Task created = taskService.createTask(task, userId != null ? userId : "usr-admin", userName != null ? userName : "User");
        return ResponseEntity.ok(created);
    }

    @PostMapping("/tasks/{id}/transition")
    public ResponseEntity<?> transitionTask(
            @PathVariable String id,
            @RequestBody Map<String, String> payload,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Name", required = false) String userName,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        try {
            String action = payload.getOrDefault("action", "");
            String feedback = payload.getOrDefault("feedback", "");
            Task updated = taskService.transitionTask(id, action, feedback, userId, userName, userRole);
            return ResponseEntity.ok(updated);
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/tasks/{id}/reassign")
    public ResponseEntity<?> reassignTask(
            @PathVariable String id,
            @RequestBody Map<String, String> payload,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Name", required = false) String userName) {
        try {
            String newAssigneeId = payload.getOrDefault("assigneeId", "");
            String newAssigneeName = payload.getOrDefault("assigneeName", "");
            String newAssigneeAvatar = payload.getOrDefault("assigneeAvatar", "US");
            String reason = payload.getOrDefault("reason", "Administrative reassignment");
            Task updated = taskService.reassignTask(id, newAssigneeId, newAssigneeName, newAssigneeAvatar, reason, userId, userName);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/tasks/{id}/history")
    public ResponseEntity<List<TaskHistory>> getTaskHistory(@PathVariable String id) {
        return ResponseEntity.ok(taskService.getTaskHistory(id));
    }

    @GetMapping("/deadlines")
    public ResponseEntity<List<Deadline>> getAllDeadlines() {
        return ResponseEntity.ok(taskService.getAllDeadlines());
    }

    @PostMapping("/deadlines")
    public ResponseEntity<?> createDeadline(
            @RequestBody Deadline deadline,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        Deadline created = taskService.createDeadline(deadline, userId != null ? userId : "usr-admin");
        return ResponseEntity.ok(created);
    }

    @PutMapping("/deadlines/{id}")
    public ResponseEntity<?> updateDeadline(
            @PathVariable String id,
            @RequestBody Deadline deadline,
            @RequestParam(value = "reason", required = false) String reason,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        try {
            Deadline updated = taskService.updateDeadline(id, deadline, reason != null ? reason : "Date updated", userId);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
