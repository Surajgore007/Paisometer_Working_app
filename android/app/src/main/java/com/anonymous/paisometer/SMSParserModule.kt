package com.anonymous.paisometer

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.content.Intent
import android.provider.Settings
import android.util.Log

class SMSParserModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SMSParser"
    }

    // 1. Check Queue for new transactions
    @ReactMethod
    fun checkPendingTransactions(promise: Promise) {
        try {
            // Read from the Shared Memory (This returns a JSON String)
            val jsonString = TransactionStore.popAll(reactContext)
            promise.resolve(jsonString)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    // 2. Open Android Settings Page (For Permissions)
    @ReactMethod
    fun requestPermission() {
        try {
            val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            Log.e("SMSParser", "Failed to open settings", e)
        }
    }

    // 3. Check if Permission is granted
    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        try {
            val contentResolver = reactContext.contentResolver
            val enabledListeners = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
            val packageName = reactContext.packageName
            val isGranted = enabledListeners != null && enabledListeners.contains(packageName)
            promise.resolve(isGranted)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun startForegroundService() {
        try {
            val intent = Intent(reactContext, BankNotificationService::class.java)
            androidx.core.content.ContextCompat.startForegroundService(reactContext, intent)
        } catch (e: Exception) {
            Log.e("SMSParser", "Failed to start foreground service", e)
        }
    }
}