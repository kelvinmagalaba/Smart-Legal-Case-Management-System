package com.slcms.service;

import com.slcms.model.LegalPassage;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Service responsible for chunking raw legal text into coherent, searchable passages.
 */
@Service
public class PassageChunkingService {

    private static final int TARGET_CHUNK_WORD_COUNT = 300;
    private static final int OVERLAP_WORD_COUNT = 40;

    /**
     * Divides extracted raw legal text into searchable passage objects.
     */
    public List<LegalPassage> chunkTextIntoPassages(String documentId, String rawText, String courtHierarchy) {
        List<LegalPassage> passages = new ArrayList<>();
        if (rawText == null || rawText.trim().isEmpty()) {
            return passages;
        }

        // Split text by paragraphs / double newlines first
        String[] paragraphs = rawText.split("\\n\\s*\\n");
        List<String> textBlocks = new ArrayList<>();

        StringBuilder currentBlock = new StringBuilder();
        int currentWordCount = 0;

        for (String paragraph : paragraphs) {
            String cleanP = paragraph.trim();
            if (cleanP.isEmpty()) continue;

            int pWordCount = cleanP.split("\\s+").length;

            if (currentWordCount + pWordCount > TARGET_CHUNK_WORD_COUNT && currentWordCount > 0) {
                textBlocks.add(currentBlock.toString().trim());
                
                // Create overlap window
                String[] words = currentBlock.toString().trim().split("\\s+");
                int overlapStart = Math.max(0, words.length - OVERLAP_WORD_COUNT);
                currentBlock = new StringBuilder();
                for (int i = overlapStart; i < words.length; i++) {
                    currentBlock.append(words[i]).append(" ");
                }
                currentWordCount = words.length - overlapStart;
            }

            currentBlock.append(cleanP).append("\n\n");
            currentWordCount += pWordCount;
        }

        if (currentBlock.length() > 0) {
            textBlocks.add(currentBlock.toString().trim());
        }

        // If paragraph splitting produced no blocks (e.g. single long text), split by words
        if (textBlocks.isEmpty()) {
            String[] words = rawText.split("\\s+");
            int i = 0;
            while (i < words.length) {
                int end = Math.min(i + TARGET_CHUNK_WORD_COUNT, words.length);
                StringBuilder sb = new StringBuilder();
                for (int j = i; j < end; j++) {
                    sb.append(words[j]).append(" ");
                }
                textBlocks.add(sb.toString().trim());
                i += (TARGET_CHUNK_WORD_COUNT - OVERLAP_WORD_COUNT);
            }
        }

        // Build LegalPassage entities
        int charOffset = 0;
        int passageIndex = 1;

        for (String block : textBlocks) {
            if (block.trim().length() < 15) continue;

            int wordCount = block.split("\\s+").length;
            int charLength = block.length();

            // Detect legal cues
            boolean isRatio = Pattern.compile("(?i)\\b(held|ordered|judgment|ruled|reasons|decision|ratio decidendi|in our view|we find that)\\b").matcher(block).find();
            
            // Detect statutory section references (e.g. "Section 73", "Order XXXIX", "Cap. 345")
            String statutoryRef = null;
            var secMatcher = Pattern.compile("(?i)\\b(Section\\s+\\d+|Order\\s+[IVXLCDM]+|Cap\\.\\s*\\d+|Article\\s+\\d+)\\b").matcher(block);
            if (secMatcher.find()) {
                statutoryRef = secMatcher.group(1);
            }

            // Estimate page number (~350 words per standard legal page)
            int estimatedPage = Math.max(1, (passageIndex * TARGET_CHUNK_WORD_COUNT) / 350);

            LegalPassage passage = LegalPassage.builder()
                    .id("pass-" + UUID.randomUUID().toString().substring(0, 8))
                    .documentId(documentId)
                    .passageIndex(passageIndex++)
                    .text(block)
                    .characterStart(charOffset)
                    .characterEnd(charOffset + charLength)
                    .wordCount(wordCount)
                    .pageNumber(estimatedPage)
                    .isRatioDecidendi(isRatio)
                    .statutorySectionRef(statutoryRef)
                    .courtHierarchy(courtHierarchy)
                    .indexedAt(LocalDateTime.now())
                    .build();

            passages.add(passage);
            charOffset += charLength + 2;
        }

        return passages;
    }
}
