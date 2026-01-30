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
            if (sbn == null) return
            
            val packageName = sbn.packageName

            // 0. NOISE FILTER (Crucial for Efficiency)
            // Ignore "Messages is doing work" (Ongoing/Foreground Service)
            // This prevents log spam and processing wrong events.
            if (sbn.isOngoing || (sbn.notification.flags and Notification.FLAG_FOREGROUND_SERVICE) != 0) {
                return
            }

            // 1. DYNAMIC CHECK (Production Robustness)
            // Ask Android: "What is the user's SMS app?"
            // This handles any app the user chooses (e.g. Textra, Pulse, Signal)
            val defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(applicationContext)

            // 2. STATIC FALLBACK (Reliability)
            // If API returns null (some devices) or user hasn't set one, use known heavy hitters.
            val allowedApps = setOf(
                "com.google.android.apps.messaging",
                "com.samsung.android.messaging",
                "com.android.mms",
                "com.oneplus.mms",
                "com.oneplus.apps.messaging",
                "com.truecaller",
                "com.microsoft.android.smsorganizer" // Popular in India
            )

            var isAllowed = false
            if (defaultSmsPackage != null && packageName == defaultSmsPackage) {
                isAllowed = true
            } else if (packageName in allowedApps) {
                isAllowed = true
            }

            if (!isAllowed) {
                return 
            }

            Log.d("PaisometerNative", "Processing SMS from $packageName")

            // 2. Extract Content safely
            val extras = sbn.notification.extras
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

            val fullMessage = fullMessageRaw

            // 3. Pass to Parser
            if (fullMessage.isNotBlank()) {
                // We call the Parser that lives in TxnParser.kt
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
            val alertChannel = android.app.NotificationChannel(
                "PAISO_ALERTS_ID",
                "Paisometer Budget Alerts",
                android.app.NotificationManager.IMPORTANCE_HIGH
            )
            alertChannel.description = "Urgent warnings when daily limits are breached"
            alertChannel.enableVibration(true)
            manager.createNotificationChannel(alertChannel) // <-- THIS WAS MISSING!

            // CHANNEL 3: ACTION CHANNEL (For Categorization Prompts)
            // IMPORTANCE_HIGH = Heads-up Notification (Pop-up)
            val actionChannel = android.app.NotificationChannel(
                "PAISO_ACTION_ID",
                "Paisometer Actions",
                android.app.NotificationManager.IMPORTANCE_HIGH
            )
            actionChannel.description = "Interactive prompts to categorize transactions"
            actionChannel.enableVibration(true)
            manager.createNotificationChannel(actionChannel)
        }
    }

    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = android.app.PendingIntent.getActivity(
            this, 0, notificationIntent,
            android.app.PendingIntent.FLAG_IMMUTABLE
        )

        return android.app.Notification.Builder(this, "PAISO_CHANNEL_ID")
            .setContentTitle("Paisometer Active")
            .setContentText("Listening silently...")
            .setSmallIcon(R.drawable.ic_stat_wallet)
            .setColor(0xFF000000.toInt()) // Brand Black
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

        // Calculate Budget Context for Progress Bar
        val prefs = getSharedPreferences("PaisoBudget", Context.MODE_PRIVATE)
        val dailyLimit = prefs.getFloat("DAILY_LIMIT", 2000f).toInt() // Default 2000 if unused
        var currentSpent = prefs.getFloat("CURRENT_SPENT", 0f).toInt()
        
        // Optimistic update for visual accuracy
        currentSpent += txn.amount.toInt()

        // USE ACTION CHANNEL (High Priority)
        val notification = Notification.Builder(this, "PAISO_ACTION_ID")
            .setContentTitle("₹${txn.amount}") // BIG BOLD AMOUNT
            .setContentText("at ${txn.merchant}")
            .setSubText("Update Category") // Top header small text
            .setSmallIcon(R.drawable.ic_stat_wallet)
            .setColor(0xFF000000.toInt()) // Premium Black Accent
            .setStyle(Notification.BigTextStyle()
                .bigText("Spending at ${txn.merchant}\nTap action below to categorize."))
            .setProgress(dailyLimit, currentSpent, false) // ZOMATO STYLE PROGRESS BAR
            .setAutoCancel(true)
            .setPriority(Notification.PRIORITY_HIGH) 
            .addAction(createAction("Food", "food"))
            .addAction(createAction("Travel", "transport"))
            .addAction(createAction("Other", "other", withInput = true))
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

            // LOGIC FIX: Check Highest Severity FIRST to avoid showing "70% warning" when you just blew past 100%.
            
            // THRESHOLD 3 & 2: >= 100% (Limit Reached or Breached)
            if (ratio >= 1.0) {
                if (oldRatio < 1.0) {
                    // FRESH BREACH: Just crossed the line
                    val extra = totalSpentAfterTxn - dailyLimit
                    title = "🛑 STOP. Daily Limit Reached."
                    body = if (extra > 0) "You just overshot by ₹${extra.toInt()}. Close your wallet." 
                           else "Not a single rupee more. You hit the limit."
                } else {
                    // ONGOING BREACH: Already over, still spending (Nagging)
                    val extra = totalSpentAfterTxn - dailyLimit
                    title = "🔥 CRITICAL FAILURE"
                    body = "Bleeding money (₹${extra.toInt()} over). STOP."
                }
            }
            
            // THRESHOLD 1: 70% (Warning) - Only if we are NOT yet at 100%
            else if (ratio >= 0.7 && oldRatio < 0.7) {
                val remaining = dailyLimit - totalSpentAfterTxn
                // Safe check to ensure we don't show negative numbers (logic above prevents this, but safety first)
                if (remaining > 0) {
                    title = "⚠️ CAUTION: 70% Burnt"
                    body = "You have only ₹${remaining.toInt()} left. Tread carefully."
                }
            }

            if (title != null) {
                // Determine Icon based on severity
                val largeIconRes = if (title.contains("STOP") || title.contains("CRITICAL")) 
                    R.drawable.ic_alert_burn 
                else 
                    R.drawable.ic_alert_warning

                // Use the ALERT Channel (High Priority)
                val notification = Notification.Builder(this, "PAISO_ALERTS_ID")
                    .setContentTitle(title)
                    .setContentText(body)
                    .setSmallIcon(R.drawable.ic_stat_wallet)
                    .setLargeIcon(BitmapFactory.decodeResource(resources, largeIconRes)) // Dynamic Big Icon
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