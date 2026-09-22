package com.slcms.service;

import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

/**
 * Service responsible for extracting text from PDF, DOCX, and TXT files.
 * Uses Apache PDFBox for PDF parsing and Tesseract OCR when scanned images are encountered.
 */
@Service
public class PdfExtractionService {

    private static final Logger log = LoggerFactory.getLogger(PdfExtractionService.class);

    public static class ExtractionResult {
        private final String extractedText;
        private final int totalPages;
        private final boolean ocrApplied;

        public ExtractionResult(String extractedText, int totalPages, boolean ocrApplied) {
            this.extractedText = extractedText;
            this.totalPages = totalPages;
            this.ocrApplied = ocrApplied;
        }

        public String getExtractedText() { return extractedText; }
        public int getTotalPages() { return totalPages; }
        public boolean isOcrApplied() { return ocrApplied; }
    }

    /**
     * Extracts full textual content from uploaded multipart file.
     */
    public ExtractionResult extractText(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        if (filename.endsWith(".pdf")) {
            return extractFromPdf(file.getInputStream());
        } else if (filename.endsWith(".docx")) {
            return extractFromDocx(file.getInputStream());
        } else if (filename.endsWith(".txt")) {
            return extractFromTxt(file.getInputStream());
        } else {
            throw new IllegalArgumentException("Unsupported file type. Please upload a PDF, DOCX or TXT legal document.");
        }
    }

    /**
     * Extracts text from PDF using Apache PDFBox, with automatic OCR fallback if text density is low.
     */
    public ExtractionResult extractFromPdf(InputStream inputStream) throws Exception {
        try (PDDocument document = PDDocument.load(inputStream)) {
            int totalPages = document.getNumberOfPages();
            
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);

            String cleanText = text != null ? text.trim() : "";

            // Check if document contains readable text or is a scanned image PDF
            if (cleanText.length() >= 50) {
                log.info("Successfully extracted {} characters from PDF ({} pages) via Apache PDFBox", cleanText.length(), totalPages);
                return new ExtractionResult(cleanText, totalPages, false);
            }

            // Fallback: Perform OCR on scanned image pages
            log.warn("PDF contains low text density ({} chars). Attempting Tesseract OCR pipeline...", cleanText.length());
            String ocrText = performOcrOnPdf(document);

            if (ocrText == null || ocrText.trim().length() < 30) {
                throw new IllegalStateException("The PDF contains scanned images or unreadable formatting, and OCR extraction yielded insufficient readable text.");
            }

            log.info("Successfully completed OCR extraction on PDF: {} characters recovered.", ocrText.trim().length());
            return new ExtractionResult(ocrText.trim(), totalPages, true);
        }
    }

    /**
     * Performs Tesseract OCR on rendered PDF pages.
     */
    private String performOcrOnPdf(PDDocument document) {
        StringBuilder ocrBuilder = new StringBuilder();
        try {
            PDFRenderer renderer = new PDFRenderer(document);
            Tesseract tesseract = new Tesseract();
            
            // Set language to English & Swahili if data exists, fallback to standard English
            tesseract.setLanguage("eng");

            int pagesToScan = Math.min(document.getNumberOfPages(), 30); // scan up to 30 pages
            for (int i = 0; i < pagesToScan; i++) {
                BufferedImage image = renderer.renderImageWithDPI(i, 300);
                String pageText = tesseract.doOCR(image);
                if (pageText != null) {
                    ocrBuilder.append("\n--- [Page ").append(i + 1).append(" OCR] ---\n");
                    ocrBuilder.append(pageText.trim()).append("\n");
                }
            }
        } catch (Exception e) {
            log.error("Tesseract OCR execution failed: {}", e.getMessage());
        }
        return ocrBuilder.toString();
    }

    /**
     * Extracts text from Microsoft Word .docx files using Apache POI.
     */
    public ExtractionResult extractFromDocx(InputStream inputStream) throws Exception {
        try (XWPFDocument docx = new XWPFDocument(inputStream)) {
            StringBuilder sb = new StringBuilder();
            for (XWPFParagraph p : docx.getParagraphs()) {
                if (p.getText() != null && !p.getText().trim().isEmpty()) {
                    sb.append(p.getText().trim()).append("\n\n");
                }
            }
            String text = sb.toString().trim();
            if (text.length() < 20) {
                throw new IllegalStateException("DOCX file contains insufficient text content.");
            }
            return new ExtractionResult(text, 1, false);
        }
    }

    /**
     * Extracts text from plain text files.
     */
    public ExtractionResult extractFromTxt(InputStream inputStream) throws Exception {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String text = reader.lines().collect(Collectors.joining("\n")).trim();
            if (text.length() < 20) {
                throw new IllegalStateException("Text file contains insufficient content.");
            }
            return new ExtractionResult(text, 1, false);
        }
    }
}
