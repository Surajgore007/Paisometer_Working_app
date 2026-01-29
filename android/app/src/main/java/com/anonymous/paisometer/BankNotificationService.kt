package com.anonymous.paisometer

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import android.app.PendingIntent
import android.app.RemoteInput
import android.provider.Telephony
import android.content.Context
import android.graphics.BitmapFactory
import kotlin.random.Random

class BankNotificationService : NotificationListenerService() {

    private var lastTxnSignature: String = ""
    private var lastTxnTime: Long = 0

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        try {
            // Safety check: ensure notification is valid
            if (sbn == null) return
            
            // DEBUG LOG: Prove we received something
            Log.d("PaisometerNative", "Received notification from package: ${sbn.packageName}")

        val packageName = sbn.packageName

            // INTELLIGENT FILTER: Only process notifications from the User's Default SMS App.
            // This filters out WhatsApp, GPay, Uber, etc. without needing a hardcoded strict list.
            val defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(applicationContext)

            // Dynamic Check:
            // 1. If defaultSmsPackage is found (99% of phones), STRICTLY matching it.
            // 2. If defaultSmsPackage is null (rare cases/tablets), we fall back to allowing "com.google.android.apps.messaging" or standard list safely.
            if (defaultSmsPackage != null) {
                if (packageName != defaultSmsPackage) {
                    // It's not the SMS app -> Ignore it silently.
                    return
                }
            } else {
                // FALLBACK for weird devices: Allow Google Messages & Samsung Messages (Most common)
                // This prevents breaking the app if the API returns null.
                if (packageName != "com.google.android.apps.messaging" && 
                    packageName != "com.samsung.android.messaging" && 
                    packageName != "com.android.mms") {
                    return
                }
            }



        // 2. Extract Content safely
        val extras = sbn.notification.extras

        // Prefer BIG_TEXT / Inbox style content to avoid truncation.
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
            ?: extras.getCharSequence(Notification.EXTRA_TEXT)
            ?: extras.getCharSequence(Notification.EXTRA_SUB_TEXT)
            ?: "").toString()

        // Some messaging apps use EXTRA_TEXT_LINES (inbox style)
        val lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        val joinedLines = lines?.joinToString(" ") { it?.toString() ?: "" } ?: ""

        val fullMessageRaw = listOf(title, text, joinedLines)
            .joinToString(" ")
            .replace(Regex("\\s+"), " ")
            .trim()

        if (fullMessageRaw.isBlank()) return

        Log.d("PaisometerNative", "Raw Notification from $packageName: $fullMessageRaw")

        // Combine them so the parser sees "HDFC Bank: Rs 500 debited..."
        val fullMessage = fullMessageRaw

        // 3. Pass to Parser
        if (fullMessage.isNotBlank()) {
            // We call the Parser that lives in TxnParser.kt
            // Using fullMessage improves merchant detection if the name is in the title
            val txn = TxnParser.parseSms(fullMessage) 
            
            if (txn != null) {
                // Deduplication: Check if we processed this exact txn signature < 5 seconds ago
                val signature = "${txn.amount}|${txn.merchant}|${txn.type}"
                val now = System.currentTimeMillis()
                
                if (signature == lastTxnSignature && (now - lastTxnTime) < 5000) {
                    Log.d("PaisometerNative", "Duplicate ignored: $signature")
                    return
                }
                
                lastTxnSignature = signature
                lastTxnTime = now

                Log.d("PaisometerNative", "Transaction Captured: ${txn.amount} at ${txn.merchant}")
                
                // 4. Save to Queue (Dead Letter Queue)
                TransactionStore.add(applicationContext, txn)
                
                // 5. Show Interactive Notification
                if (txn.type != "income") {
                    showCategorizationNotification(txn)
                    
                    // --- SMART ALERTS (PsyOps) ---
                    checkBudgetThresholds(txn.amount)
                }
            }
        }
        } catch (e: Exception) {
            Log.e("PaisometerNative", "CRASH in onNotificationPosted", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Do nothing when user dismisses notification
    }

    // ------------------------------------------------------------------
    // "Sticky" Service Logic to prevent background killing
    // ------------------------------------------------------------------
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = createNotification()
        
        // Android 14 requires specifying the type if defined in manifest
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
             startForeground(1, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
             startForeground(1, notification)
        }
        
        // START_STICKY tells Android: "If you kill this service to save memory, 
        // restart it automatically as soon as possible."
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val serviceChannel = android.app.NotificationChannel(
                "PAISO_CHANNEL_ID",
                "Paisometer Background Service",
                android.app.NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(android.app.NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)

            // CHANNEL 2: ALERT CHANNEL (For Urgent Budget Warnings)
            // IMPORTANCE_HIGH = Heads-up Notification (Popup) + Sound
            val alertChannel = android.app.NotificationChannel(
                "PAISO_ALERTS_ID",
                "Paisometer Budget Alerts",
                android.app.NotificationManager.IMPORTANCE_HIGH
            )
            alertChannel.description = "Urgent warnings when daily limits are breached"
            alertChannel.enableVibration(true)
            manager.createNotificationChannel(alertChannel)
        }
    }

    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = android.app.PendingIntent.getActivity(
            this, 0, notificationIntent,
            android.app.PendingIntent.FLAG_IMMUTABLE
        )

        return android.app.Notification.Builder(this, "PAISO_CHANNEL_ID")
            .setContentTitle("Paisometer is Active")
            .setContentText("Listening for financial SMS...")
            .setSmallIcon(R.mipmap.ic_stat_paiso)
            .setLargeIcon(BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher))
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun showCategorizationNotification(txn: ParsedTxn) {
        val notificationId = Random.nextInt(1000, 9999)

        // Helper to create action intent
        fun createAction(label: String, categoryKey: String, withInput: Boolean = false): Notification.Action {
            val intent = Intent(this, CategorizationReceiver::class.java).apply {
                action = "com.anonymous.paisometer.ACTION_CATEGORIZE"
                putExtra("txn_id", txn.id)
                putExtra("category", categoryKey)
                putExtra("notification_id", notificationId)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                this, 
                Random.nextInt(), 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE // Mutable needed for RemoteInput
            )

            val builder = Notification.Action.Builder(null, label, pendingIntent)

            if (withInput) {
                val remoteInput = RemoteInput.Builder("custom_note")
                    .setLabel("What is this for?")
                    .build()
                builder.addRemoteInput(remoteInput)
            }

            return builder.build()
        }

        val notification = Notification.Builder(this, "PAISO_CHANNEL_ID")
            .setContentTitle("New Transaction: ₹${txn.amount}")
            .setContentText("at ${txn.merchant}. Categorize it?")
            .setSmallIcon(R.mipmap.ic_stat_paiso)
            .setLargeIcon(BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher))
            .setAutoCancel(true)
            .addAction(createAction("🍔 Food", "food"))
            .addAction(createAction("🚕 Travel", "transport"))
            .addAction(createAction("❔ Other", "other", withInput = true))
            .build()

        val manager = getSystemService(android.app.NotificationManager::class.java)
        manager.notify(notificationId, notification)
    }

    /**
     * PSYCHOLOGICAL ALERTS:
     * Reads the synced "Budget Context" (Daily Limit & Current Spent) and triggers warning if thresholds are crossed.
     */
    private fun checkBudgetThresholds(newExpenseAmount: Double) {
        try {
            val prefs = getSharedPreferences("PaisoBudget", Context.MODE_PRIVATE)
            val dailyLimit = prefs.getFloat("DAILY_LIMIT", 0f).toDouble()
            val previouslySpent = prefs.getFloat("CURRENT_SPENT", 0f).toDouble()

            if (dailyLimit <= 0) return // No context available

            val totalSpentAfterTxn = previouslySpent + newExpenseAmount
            val ratio = totalSpentAfterTxn / dailyLimit

            // We also need the "Old Ratio" to ensure we only trigger the alert ONCE when crossing the line
            // otherwise every small txn after 70% would spam the user.
            val oldRatio = previouslySpent / dailyLimit

            var title: String? = null
            var body: String? = null

            // THRESHOLD 1: 70% (Warning)
            if (ratio >= 0.7 && oldRatio < 0.7) {
                val remaining = dailyLimit - totalSpentAfterTxn
                title = "⚠️ CAUTION: 70% Burnt"
                body = "You have only ₹${remaining.toInt()} left. Tread carefully."
            }

            // THRESHOLD 2: 100% (Limit Reached)
            else if (ratio >= 1.0 && oldRatio < 1.0) {
                title = "🛑 STOP. Daily Limit Reached."
                body = "Not a single rupee more. Close your wallet."
            }

            // THRESHOLD 3: > 100% (Overdraft - Every txn triggers this now)
            else if (ratio > 1.0 && oldRatio >= 1.0) {
                 // For overdraft, we might want to nag them on every significant txn, or maybe slightly randomized?
                 // Let's nag them.
                 val extra = totalSpentAfterTxn - dailyLimit
                 title = "💀 CRITICAL FAILURE"
                 body = "You are bleeding money (₹${extra.toInt()} over). Future you is suffering."
            }

            if (title != null) {
                // Use the ALERT Channel (High Priority)
                val notification = Notification.Builder(this, "PAISO_ALERTS_ID")
                    .setContentTitle(title)
                    .setContentText(body)
                    .setSmallIcon(R.mipmap.ic_stat_paiso)
                    .setLargeIcon(BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher))
                    .setAutoCancel(true)
                    .setPriority(Notification.PRIORITY_HIGH) // For older Androids
                    .setCategory(Notification.CATEGORY_ALARM) // Treat as critical
                    .build()

                val manager = getSystemService(android.app.NotificationManager::class.java)
                manager.notify(Random.nextInt(), notification)
                
                // Update the Local Prefs immediately so next txn sees new state (Optimistic Update)
                // This prevents race conditions if the app is killed and doesn't sync back immediately.
                with (prefs.edit()) {
                    putFloat("CURRENT_SPENT", totalSpentAfterTxn.toFloat())
                    apply()
                }
            }

        } catch (e: Exception) {
            Log.e("PaisometerNative", "Failed to check budget thresholds", e)
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d("PaisometerNative", "Service Connected: User has granted/restored notification access")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d("PaisometerNative", "Service Disconnected: Listener unbinded")
    }
}