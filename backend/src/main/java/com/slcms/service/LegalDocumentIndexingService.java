package com.slcms.service;

import com.slcms.dto.LegalSourceUploadDto;
import com.slcms.model.LegalPassage;
import com.slcms.model.LegalSourceDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service managing document upload, PDF text extraction, passage indexing, and storage.
 */
@Service
public class LegalDocumentIndexingService {

    private static final Logger log = LoggerFactory.getLogger(LegalDocumentIndexingService.class);
    private static final String UPLOAD_DIR = "uploads/legal_sources";

    private final PdfExtractionService pdfExtractionService;
    private final PassageChunkingService passageChunkingService;

    // In-memory document & passage database
    private final Map<String, LegalSourceDocument> documentRepository = new ConcurrentHashMap<>();

    @Autowired
    public LegalDocumentIndexingService(PdfExtractionService pdfExtractionService,
                                        PassageChunkingService passageChunkingService) {
        this.pdfExtractionService = pdfExtractionService;
        this.passageChunkingService = passageChunkingService;
        initSeedDocuments();
    }

    /**
     * Executes the full 4-stage document indexing pipeline:
     * 1. Save uploaded file to disk
     * 2. Extract full text via Apache PDFBox (or Tesseract OCR if scanned image)
     * 3. Divide extracted text into indexed legal passages
     * 4. Mark "Ready for AI" ONLY IF valid readable passages exist
     */
    public LegalSourceDocument processAndIndexDocument(MultipartFile file, LegalSourceUploadDto metadata, String uploadedBy) {
        String docId = "doc-lib-" + UUID.randomUUID().toString().substring(0, 8);
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String fileType = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toUpperCase();

        LocalDate decisionDate = null;
        if (metadata.getDecisionDate() != null && !metadata.getDecisionDate().trim().isEmpty()) {
            try {
                decisionDate = LocalDate.parse(metadata.getDecisionDate());
            } catch (Exception ignored) {}
        }

        LegalSourceDocument doc = LegalSourceDocument.builder()
                .id(docId)
                .title(metadata.getTitle() != null && !metadata.getTitle().trim().isEmpty() ? metadata.getTitle() : originalFilename)
                .sourceName(metadata.getSource() != null ? metadata.getSource() : "TanzLII")
                .tanzliiUrl(metadata.getTanzliiUrl())
                .court(metadata.getCourt() != null ? metadata.getCourt() : "High Court of Tanzania")
                .caseNumber(metadata.getCaseNumber())
                .decisionDate(decisionDate != null ? decisionDate : LocalDate.now())
                .category(metadata.getCategory() != null ? metadata.getCategory() : "General Legal")
                .description(metadata.getDescription())
                .accessLevel(metadata.getAccessLevel() != null ? metadata.getAccessLevel() : "Entire Law Firm")
                .relatedCaseId(metadata.getRelatedCaseId())
                .uploadedBy(uploadedBy != null ? uploadedBy : "Authorized Counsel")
                .uploadedAt(LocalDateTime.now())
                .originalFileName(originalFilename)
                .fileType(fileType)
                .fileSizeBytes(file.getSize())
                .status(LegalSourceDocument.DocumentStatus.UPLOADED)
                .build();

        try {
            // Stage 1: Save file to disk
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            Path destination = uploadPath.resolve(docId + "_" + originalFilename);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            doc.setStoredFilePath(destination.toString());

            // Stage 2: Extract text via Apache PDFBox / OCR
            doc.setStatus(LegalSourceDocument.DocumentStatus.EXTRACTING_TEXT);
            PdfExtractionService.ExtractionResult result = pdfExtractionService.extractText(file);
            
            String rawText = result.getExtractedText();
            doc.setRawExtractedText(rawText);
            doc.setTotalPages(result.getTotalPages());
            doc.setOcrApplied(result.isOcrApplied());
            doc.setTotalCharacterCount(rawText != null ? rawText.length() : 0);
            doc.setTotalWordCount(rawText != null ? rawText.split("\\s+").length : 0);

            // Stage 3: Divide into searchable legal passages
            doc.setStatus(LegalSourceDocument.DocumentStatus.INDEXING);
            List<LegalPassage> passages = passageChunkingService.chunkTextIntoPassages(docId, rawText, doc.getCourt());
            doc.setPassages(passages);

            // Stage 4: Strict Validation - Do not mark Ready for AI unless passages were created
            if (passages.isEmpty() || doc.getTotalWordCount() < 15) {
                doc.setStatus(LegalSourceDocument.DocumentStatus.PROCESSING_FAILED);
                doc.setFailureReason("Extraction produced insufficient readable text. Scanned documents require OCR preprocessing.");
                log.warn("Document {} failed indexing: No readable passages extracted.", docId);
            } else {
                doc.setStatus(LegalSourceDocument.DocumentStatus.READY_FOR_AI);
                log.info("Document {} successfully indexed with {} passages. Marked READY_FOR_AI.", docId, passages.size());
            }

        } catch (Exception e) {
            log.error("Failed to process document {}: {}", docId, e.getMessage(), e);
            doc.setStatus(LegalSourceDocument.DocumentStatus.PROCESSING_FAILED);
            doc.setFailureReason(e.getMessage() != null ? e.getMessage() : "Document text extraction failed.");
        }

        documentRepository.put(docId, doc);
        return doc;
    }

    public List<LegalSourceDocument> getAllDocuments() {
        return new ArrayList<>(documentRepository.values());
    }

    public Optional<LegalSourceDocument> getDocumentById(String id) {
        return Optional.ofNullable(documentRepository.get(id));
    }

    public List<LegalPassage> getPassagesByDocumentId(String docId) {
        LegalSourceDocument doc = documentRepository.get(docId);
        return doc != null ? doc.getPassages() : Collections.emptyList();
    }

    public boolean deleteDocument(String id) {
        return documentRepository.remove(id) != null;
    }

    /**
     * Seeds initial verified Tanzania legal source documents.
     */
    private void initSeedDocuments() {
        String muwingeText = "IN THE HIGH COURT OF TANZANIA (MAIN REGISTRY AT DAR ES SALAAM)\n" +
                "PROBATE AND ADMINISTRATION CAUSE NO. 74 OF 2019 / [2020] TZHC 10045\n\n" +
                "IN THE MATTER OF THE ESTATE OF THE LATE SALUM MUWINGE (DECEASED)\n" +
                "AND\n" +
                "IN THE MATTER OF AN APPLICATION FOR LETTERS OF ADMINISTRATION BY HALIMA ISMAIL (PETITIONER)\n" +
                "VERSUS\n" +
                "ABDALLAH SALUM MUWINGE (CAVEATOR / OBJECTOR)\n\n" +
                "JUDGMENT & REASONS\n" +
                "MASSOUD, J.:\n\n" +
                "The dispute before this Court concerns the administration and distribution of the estate of the late Salum Muwinge, deceased, who died intestate in Dar es Salaam leaving valuable immovable real property comprising a residential house situated at Ilala.\n\n" +
                "The Petitioner, Halima Ismail, petitioned for grant of Letters of Administration claiming legal standing as lawful surviving spouse under the Probate and Administration of Estates Act [Cap. 352 R.E. 2019] and the Law of Marriage Act [Cap. 29 R.E. 2019].\n\n" +
                "The Objector, Abdallah Salum Muwinge, lodged a caveat asserting that the marriage between the deceased and the Petitioner had been dissolved under Islamic rites (talak) prior to the death of the deceased, and that customary paternal heirs held paramount entitlement.\n\n" +
                "HELD:\n" +
                "1. Under Tanzanian probate law, marriage creates a strong presumption of legal validity and priority in the grant of letters of administration pursuant to Sections 5 and 23 of Cap. 352.\n" +
                "2. Where a caveator alleges dissolution of marriage, the evidentiary burden strictly lies on the caveator to tender formal documentary proof or corroborated testimony. The caveator having failed to produce a valid divorce certificate, the marriage was subsisting at the time of death.\n" +
                "3. The caveat is dismissed with costs, and Letters of Administration are granted to Halima Ismail.";

        LegalSourceDocument doc = LegalSourceDocument.builder()
                .id("doc-lib-005")
                .title("Abdallah Salum Muwinge vs Halima Ismail [2020] TZHC 10045")
                .sourceName("TanzLII (Tanzania Legal Information Institute)")
                .tanzliiUrl("https://tanzlii.org/tz/judgment/high-court-tanzania/2020/10045")
                .court("High Court of Tanzania (Main Registry at Dar es Salaam)")
                .caseNumber("Probate Cause No. 74 of 2019 / [2020] TZHC 10045")
                .decisionDate(LocalDate.of(2020, 8, 28))
                .category("Probate and Family law")
                .description("High Court precedent on surviving spousal priority in grant of letters of administration, burden of proof on caveat alleging divorce, and protection of matrimonial residential property.")
                .accessLevel("Public Legal Library")
                .uploadedBy("Julian Mercer, Esq.")
                .uploadedAt(LocalDateTime.now().minusDays(5))
                .originalFileName("Muwinge_vs_Halima_2020_TZHC_10045.pdf")
                .fileType("PDF")
                .fileSizeBytes(2890000)
                .status(LegalSourceDocument.DocumentStatus.READY_FOR_AI)
                .rawExtractedText(muwingeText)
                .totalWordCount(muwingeText.split("\\s+").length)
                .totalCharacterCount(muwingeText.length())
                .totalPages(4)
                .ocrApplied(false)
                .build();

        List<LegalPassage> passages = passageChunkingService.chunkTextIntoPassages(doc.getId(), muwingeText, doc.getCourt());
        doc.setPassages(passages);

        documentRepository.put(doc.getId(), doc);
    }
}
