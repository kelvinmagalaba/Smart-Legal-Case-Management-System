package com.slcms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIQueryRequest {

    private String query;
    private String scope; // 'all' | 'tanzlii' | 'legislation' | 'case_docs'
    private String selectedCaseId;
    private List<String> targetDocumentIds;
    private String userRole;
    private String userName;
}
