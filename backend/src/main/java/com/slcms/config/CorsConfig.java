package com.slcms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.List;

/**
 * Enterprise CORS Configuration for SLCMS.
 * Allows communication from the deployed Vercel frontend as well as local development environments.
 * Specifically satisfies:
 * - Credentials support (allowCredentials = true)
 * - Safe origin matching without wildcard collision
 */
@Configuration
public class CorsConfig {

    @Value("${slcms.cors.frontend-url:https://your-slcms.vercel.app}")
    private String frontendUrl;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                List<String> allowedOrigins = new ArrayList<>();

                if (frontendUrl != null && !frontendUrl.trim().isEmpty()) {
                    String cleanUrl = frontendUrl.trim();
                    allowedOrigins.add(cleanUrl);
                    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
                        allowedOrigins.add("https://" + cleanUrl);
                        allowedOrigins.add("http://" + cleanUrl);
                    }
                }

                // Local frontend development hosts
                allowedOrigins.add("http://localhost:3000");
                allowedOrigins.add("http://localhost:5173");
                allowedOrigins.add("http://localhost:5500");
                allowedOrigins.add("http://localhost:8080");
                allowedOrigins.add("http://127.0.0.1:3000");
                allowedOrigins.add("http://127.0.0.1:5173");
                allowedOrigins.add("http://127.0.0.1:5500");
                allowedOrigins.add("http://127.0.0.1:8080");

                // Wildcard pattern matching for preview deployments on vercel.app
                allowedOrigins.add("https://*.vercel.app");

                registry.addMapping("/api/**")
                        .allowedOriginPatterns(allowedOrigins.toArray(new String[0]))
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}
