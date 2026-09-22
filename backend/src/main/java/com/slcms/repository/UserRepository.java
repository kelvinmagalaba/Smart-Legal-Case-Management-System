package com.slcms.repository;

import com.slcms.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for UserAccount entities.
 * Connects directly to the permanent online database (PostgreSQL / MySQL / H2).
 */
@Repository
public interface UserRepository extends JpaRepository<UserAccount, String> {

    Optional<UserAccount> findByEmailIgnoreCase(String email);

    Optional<UserAccount> findByStaffIdIgnoreCase(String staffId);

    Optional<UserAccount> findByEmployeeIdIgnoreCase(String employeeId);

    Optional<UserAccount> findByPhone(String phone);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByStaffIdIgnoreCase(String staffId);

    boolean existsByPhone(String phone);
}
