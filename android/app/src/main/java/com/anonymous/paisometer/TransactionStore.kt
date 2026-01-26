package com.anonymous.paisometer

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import android.util.Log

object TransactionStore {
    // 1. HARDCODED FILENAME: Ensures Service and UI read the same file
    private const val PREF_NAME = "PaisometerData"
    private const val KEY_QUEUE = "sms_queue"

    private fun getPrefs(context: Context): SharedPreferences {
        // MODE_PRIVATE is standard, but by keeping everything in one process, 
        // this will be 100% reliable.
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    // Called by the Service to save a new SMS
    fun add(context: Context, txn: ParsedTxn) {
        try {
            val prefs = getPrefs(context)
            val currentJson = prefs.getString(KEY_QUEUE, "[]")
            val jsonArray = JSONArray(currentJson)

            val newObj = JSONObject().apply {
                put("id", txn.id)
                put("type", txn.type)
                put("amount", txn.amount)
                put("merchant", txn.merchant) 
                put("category", "uncategorized")       // Default category
                put("note", txn.note ?: "Auto-detected")
                put("timestamp", txn.timestamp)
            }

            jsonArray.put(newObj)
            
            // FIX: Added parentheses to .commit()
            // Using commit() instead of apply() ensures the data is written to disk 
            // IMMEDIATELY so the UI can see it.
            val success = prefs.edit().putString(KEY_QUEUE, jsonArray.toString()).commit()
            
            if (success) {
                Log.d("PaisometerNative", "Saved to Store. Queue size: ${jsonArray.length()}")
            } else {
                Log.e("PaisometerNative", "Failed to commit transaction to SharedPreferences")
            }
        } catch (e: Exception) {
            Log.e("PaisometerNative", "Error saving transaction", e)
        }
    }

    // Called by CategorizationReceiver to update category (and optional note)
    fun updateCategoryAndNote(context: Context, id: String, newCategory: String, newNote: String? = null) {
        try {
            val prefs = getPrefs(context)
            val currentJson = prefs.getString(KEY_QUEUE, "[]")
            val jsonArray = JSONArray(currentJson)
            val newJsonArray = JSONArray()
            var found = false

            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                if (obj.optString("id") == id) {
                    obj.put("category", newCategory)
                    if (newNote != null) {
                        obj.put("note", newNote)
                    }
                    Log.d("PaisometerNative", "Updated $id: Cat=$newCategory, Note=$newNote")
                    found = true
                }
                newJsonArray.put(obj)
            }

            if (found) {
                // Determine committed success
                 val success = prefs.edit().putString(KEY_QUEUE, newJsonArray.toString()).commit()
                 if(success)  Log.d("PaisometerNative", "Update committed to disk.")
            }

        } catch (e: Exception) {
            Log.e("PaisometerNative", "Error updating transaction", e)
        }
    }

    // Called by React Native to fetch and CLEAR the queue
    fun popAll(context: Context): String {
        try {
            val prefs = getPrefs(context)
            val currentJson = prefs.getString(KEY_QUEUE, "[]")
            
            // Clear the queue immediately so we don't process duplicates
            if (currentJson != "[]" && currentJson != null) {
                // FIX: Changed to .commit() for instant disk update
                prefs.edit().putString(KEY_QUEUE, "[]").commit()
                Log.d("PaisometerNative", "Popped transactions to React Native")
            }
            
            return currentJson ?: "[]"
        } catch (e: Exception) {
            Log.e("PaisometerNative", "Error popping transactions", e)
            return "[]"
        }
    }
}