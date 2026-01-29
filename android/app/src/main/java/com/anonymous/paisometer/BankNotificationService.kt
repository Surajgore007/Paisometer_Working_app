package com.anonymous.paisometer

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import android.app.PendingIntent
import android.app.RemoteInput
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

        // Avoid self-notifications (rare) and obvious noise sources.
        // IMPORTANT: We do NOT rely on a strict allowlist because many banks/OTPs
        // come via different apps and notification wrappers. We instead rely on
        // TxnParser's trigger + amount/type detection.
        if (packageName == applicationContext.packageName) return

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
            .setSmallIcon(R.mipmap.ic_launcher)
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
            .setSmallIcon(R.mipmap.ic_launcher)
            .setAutoCancel(true)
            .addAction(createAction("🍔 Food", "food"))
            .addAction(createAction("🚕 Travel", "transport"))
            .addAction(createAction("❔ Other", "other", withInput = true))
            .build()

        val manager = getSystemService(android.app.NotificationManager::class.java)
        manager.notify(notificationId, notification)
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