package com.anonymous.paisometer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.app.NotificationManager
import android.app.RemoteInput
import android.util.Log

class CategorizationReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        
        if (action == "com.anonymous.paisometer.ACTION_CATEGORIZE") {
            val id = intent.getStringExtra("txn_id")
            val category = intent.getStringExtra("category")
            val notificationId = intent.getIntExtra("notification_id", -1)

            if (id != null && category != null) {
                // Check for RemoteInput (User typed custom note)
                val remoteInput = RemoteInput.getResultsFromIntent(intent)
                val customNote = remoteInput?.getCharSequence("custom_note")?.toString()

                // 1. Update the store
                Log.d("PaisometerNative", "Received categorization action: $category for txn $id. Note: $customNote")
                TransactionStore.updateCategoryAndNote(context, id, category, customNote)

                // 2. Cancel the notification
                if (notificationId != -1) {
                    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.cancel(notificationId)
                }
            }
        }
    }
}
