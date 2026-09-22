package com.slcms.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.slcms.model.Deadline;
import com.slcms.model.Task;
import com.slcms.model.TaskHistory;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class TaskRepository {

    private static final String DATA_DIR = "data";
    private static final String TASKS_FILE = "data/tasks.json";
    private static final String DEADLINES_FILE = "data/deadlines.json";
    private static final String HISTORY_FILE = "data/task_history.json";

    private final ObjectMapper objectMapper;
    private final Map<String, Task> tasksMap = new ConcurrentHashMap<>();
    private final Map<String, Deadline> deadlinesMap = new ConcurrentHashMap<>();
    private final List<TaskHistory> historyList = Collections.synchronizedList(new ArrayList<>());

    public TaskRepository() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        initStorage();
    }

    private synchronized void initStorage() {
        try {
            Path dir = Paths.get(DATA_DIR);
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
            }

            File taskFile = new File(TASKS_FILE);
            if (taskFile.exists() && taskFile.length() > 0) {
                List<Task> loaded = objectMapper.readValue(taskFile, new TypeReference<List<Task>>() {});
                for (Task t : loaded) {
                    tasksMap.put(t.getId(), t);
                }
            }

            File deadlineFile = new File(DEADLINES_FILE);
            if (deadlineFile.exists() && deadlineFile.length() > 0) {
                List<Deadline> loaded = objectMapper.readValue(deadlineFile, new TypeReference<List<Deadline>>() {});
                for (Deadline d : loaded) {
                    deadlinesMap.put(d.getId(), d);
                }
            }

            File histFile = new File(HISTORY_FILE);
            if (histFile.exists() && histFile.length() > 0) {
                List<TaskHistory> loaded = objectMapper.readValue(histFile, new TypeReference<List<TaskHistory>>() {});
                historyList.addAll(loaded);
            }
        } catch (Exception e) {
            System.err.println("Failed to initialize task storage: " + e.getMessage());
        }
    }

    public synchronized void persistTasks() {
        try {
            File taskFile = new File(TASKS_FILE);
            objectMapper.writeValue(taskFile, new ArrayList<>(tasksMap.values()));
        } catch (Exception e) {
            System.err.println("Failed to persist tasks: " + e.getMessage());
        }
    }

    public synchronized void persistDeadlines() {
        try {
            File deadlineFile = new File(DEADLINES_FILE);
            objectMapper.writeValue(deadlineFile, new ArrayList<>(deadlinesMap.values()));
        } catch (Exception e) {
            System.err.println("Failed to persist deadlines: " + e.getMessage());
        }
    }

    public synchronized void persistHistory() {
        try {
            File histFile = new File(HISTORY_FILE);
            objectMapper.writeValue(histFile, new ArrayList<>(historyList));
        } catch (Exception e) {
            System.err.println("Failed to persist task history: " + e.getMessage());
        }
    }

    public List<Task> findAllTasks() {
        return new ArrayList<>(tasksMap.values());
    }

    public Optional<Task> findTaskById(String id) {
        return Optional.ofNullable(tasksMap.get(id));
    }

    public Task saveTask(Task task) {
        tasksMap.put(task.getId(), task);
        persistTasks();
        return task;
    }

    public void deleteTask(String id) {
        tasksMap.remove(id);
        persistTasks();
    }

    public List<Deadline> findAllDeadlines() {
        return new ArrayList<>(deadlinesMap.values());
    }

    public Optional<Deadline> findDeadlineById(String id) {
        return Optional.ofNullable(deadlinesMap.get(id));
    }

    public Deadline saveDeadline(Deadline deadline) {
        deadlinesMap.put(deadline.getId(), deadline);
        persistDeadlines();
        return deadline;
    }

    public void addHistory(TaskHistory history) {
        historyList.add(0, history);
        persistHistory();
    }

    public List<TaskHistory> findHistoryByTaskId(String taskId) {
        List<TaskHistory> result = new ArrayList<>();
        for (TaskHistory h : historyList) {
            if (h.getTaskId().equals(taskId)) {
                result.add(h);
            }
        }
        return result;
    }
}
