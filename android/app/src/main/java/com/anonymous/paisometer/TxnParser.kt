package com.anonymous.paisometer

import java.util.Locale
import java.util.regex.Pattern

import java.util.UUID

// 1. Data Class required by BankNotificationService and TransactionStore
data class ParsedTxn(
    val id: String, // Unique ID for categorization updates
    val amount: Double,
    val merchant: String,
    val type: String, // "expense" or "income"
    val timestamp: Long,
    val note: String? = null
)

object TxnParser {
    // Triggers to identify if a message is a transaction
    private val MANDATORY_TRIGGERS = listOf("debited", "credited", "spent", "paid", "received", "deposited", "sent", "transferred", "txn", "purchase", "payment", "withdrawn")

    // Patterns to find the Merchant Name (e.g., "at Swiggy", "via UPI")
    private val MERCHANT_PATTERNS = listOf(
        Pattern.compile("\\bat\\s+([A-Za-z0-9 &_.\\-\\(\\)/']{2,60})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bto\\s+([A-Za-z0-9 &_.\\-\\(\\)/']{2,60})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bvia\\s+([A-Za-z0-9 &_.\\-\\(\\)/']{2,60})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bby\\s+([A-Za-z0-9 &_.\\-\\(\\)/']{2,60})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bfor\\s+([A-Za-z0-9 &_.\\-\\(\\)/']{2,60})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bon\\s+([A-Za-z0-9 &_.\\-\\(\\)/']{2,60})", Pattern.CASE_INSENSITIVE)
    )

    // Advanced Regex for Amounts (Handles "Rs. 500", "INR 500", "500/-", etc.)
    // Advanced Regex for Amounts (Handles "Rs. 500", "INR 500", "500/-", "1000rs" etc.)
    private val AMOUNT_REGEX: Pattern = Pattern.compile(
        "(?i)" + // Case insensitive flag
        "(" +
            // Pattern 1: Currency Prefix (e.g., "Rs. 500", "INR 1,000")
            "(?:(?:[\\u20B9]|â‚¹|INR|Rs\\.?|Rs)\\s*[:\\-\\.]?\\s*(\\d+(?:,\\d+)*(?:\\.\\d{1,2})?))" + 
            "|" +
            // Pattern 2: Currency Suffix (e.g., "500 rs", "1000/-")
            "(\\d+(?:,\\d+)*(?:\\.\\d{1,2})?)(?:\\s?(?:/-|\\s*[:\\-\\.]?\\s*(?:INR|Rs\\.?|Rs|[\\u20B9]|â‚¹)\\b))" +
        ")"
    )

    // Main Function called by the Service
    fun parseSms(message: String): ParsedTxn? {
        if (!looksLikeTransaction(message)) return null

        // 1. Detect Type
        val typeRaw = detectType(message)
        if (typeRaw == "UNKNOWN") return null

        // 2. Extract Amount
        val amount = extractAmount(message)
        if (amount == 0.0) return null

        // 3. Extract Merchant
        val merchant = extractMerchant(message)

        // 4. Map to App Format ("income" / "expense")
        val finalType = if (typeRaw == "CREDIT") "income" else "expense"

        return ParsedTxn(
            id = UUID.randomUUID().toString(),
            amount = amount,
            merchant = merchant,
            type = finalType,
            timestamp = System.currentTimeMillis(),
            note = null // Privacy: Don't store full message body
        )
    }

    // --- Helper Logic ---

    private fun looksLikeTransaction(body: String): Boolean {
        val lower = body.lowercase(Locale.getDefault())
        for (t in MANDATORY_TRIGGERS) {
            if (lower.contains(t)) return true
        }
        return false
    }

    private fun detectType(body: String): String {
        val lower = body.lowercase(Locale.getDefault())
        return when {
            lower.contains("debited") || lower.contains("spent") || lower.contains("paid") || lower.contains("sent") || lower.contains("transferred") -> "DEBIT"
            lower.contains("credited") || lower.contains("received") || lower.contains("deposited") -> "CREDIT"
            else -> "UNKNOWN"
        }
    }

    private fun extractAmount(body: String): Double {
        try {
            val m = AMOUNT_REGEX.matcher(body)
            if (m.find()) {
                // Group 1: The whole match (outer parens)
                // Group 2: Amount from Prefix pattern
                // Group 3: Amount from Suffix pattern
                val gPrefix = try { m.group(2) } catch (_: Exception) { null }
                val gSuffix = try { m.group(3) } catch (_: Exception) { null }

                val raw = when {
                    !gPrefix.isNullOrBlank() -> gPrefix
                    !gSuffix.isNullOrBlank() -> gSuffix
                    else -> m.group(0) ?: ""
                }

                val normalized = raw.replace(",", "")
                    .replace("/-", "")
                    .replace("Rs", "", ignoreCase = true)
                    .replace("INR", "", ignoreCase = true)
                    .replace("\\s+".toRegex(), "")
                    .trim()

                return normalized.toDoubleOrNull() ?: 0.0
            }
        } catch (e: Exception) { }
        return 0.0
    }

    private fun extractMerchant(body: String): String {
        try {
            // Strategy A: Prepositions ("at Swiggy")
            for (pat in MERCHANT_PATTERNS) {
                val m = pat.matcher(body)
                if (m.find()) {
                    val s = m.group(1)
                    if (!s.isNullOrBlank()) {
                        // Strict cleanup: alphanumeric/spaces only, max 30 chars
                        val clean = s.trim().replace(Regex("[^A-Za-z0-9 &.]"), "").take(30)
                        if (clean.length > 2) return clean
                    }
                }
            }

            // Strategy B: Known Brands (Hardcoded fallback)
            val known = listOf("gpay", "phonepe", "paytm", "swiggy", "zomato", "amazon", "flipkart", "uber", "ola", "truecaller", "netflix", "spotify", "apple", "google")
            val lower = body.lowercase(Locale.getDefault())
            for (k in known) {
                if (lower.contains(k)) return k.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }
            }

            // Strategy C: Capitalized Words (Heuristic)
            val capPattern = Pattern.compile("([A-Z][a-zA-Z0-9&._\\-]{2,}(?:\\s+[A-Z][a-zA-Z0-9&._\\-]{2,})?)")
            val capM = capPattern.matcher(body)
            while (capM.find()) {
                val candidate = capM.group(1)
                // Filter out common banking words often capitalized
                val ignoredWords = listOf("INR", "SMS", "NEFT", "IMPS", "UPI", "DEBITED", "CREDITED", "RS", "BAL", "ACCT", "BANK", "INFO")
                
                if (candidate.uppercase() !in ignoredWords) {
                     // If it's not at the very start (which is usually the Bank Name), use it
                     if (capM.start() > 5) return candidate
                }
            }

        } catch (_: Exception) { }

        return "Unknown"
    }
}