import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import { Platform, Dimensions } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock captureRef for now - install react-native-view-shot for screenshots
const captureRef = async (ref: any, options: any): Promise<string> => {
  // This is a placeholder - install react-native-view-shot for actual screenshots
  throw new Error('react-native-view-shot not installed');
};

export interface BugReport {
  id: string;
  title: string;
  description: string;
  category: 'crash' | 'ui_bug' | 'performance' | 'feature_request' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  steps: string[];
  deviceInfo: DeviceInfo;
  appInfo: AppInfo;
  userEmail?: string;
  attachments: string[];
  timestamp: Date;
  userFeedback?: number; // 1-5 rating
  status: 'pending' | 'submitted' | 'acknowledged' | 'resolved';
}

export interface DeviceInfo {
  brand?: string;
  manufacturer?: string;
  modelName?: string;
  modelId?: string;
  deviceName?: string;
  osName?: string;
  osVersion?: string;
  osBuildId?: string;
  totalMemory?: number;
  platform: string;
  isDevice: boolean;
  screenDimensions: {
    width: number;
    height: number;
    scale: number;
  };
}

export interface AppInfo {
  appVersion: string;
  buildVersion: string;
  sdkVersion: string;
  expoVersion: string;
  bundleId?: string;
  debugMode: boolean;
  deviceId?: string;
  sessionId: string;
}

export interface BugReportTemplate {
  category: string;
  title: string;
  description: string;
  commonSteps: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class BugReportingService {
  private reportQueue: BugReport[] = [];
  private sessionId: string;
  private isOnline = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadReportQueue();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createBugReport(
    title: string,
    description: string,
    category: BugReport['category'],
    severity: BugReport['severity'],
    steps: string[] = [],
    userEmail?: string,
    screenshotRef?: any
  ): Promise<string> {
    const reportId = `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const deviceInfo = await this.getDeviceInfo();
      const appInfo = await this.getAppInfo();
      const attachments: string[] = [];

      // Capture screenshot if ref provided
      if (screenshotRef) {
        try {
          const screenshotUri = await this.captureScreenshot(screenshotRef);
          if (screenshotUri) {
            attachments.push(screenshotUri);
          }
        } catch (error) {
          console.warn('Failed to capture screenshot:', error);
        }
      }

      // Generate system info file
      const systemInfoUri = await this.generateSystemInfoFile(deviceInfo, appInfo);
      if (systemInfoUri) {
        attachments.push(systemInfoUri);
      }

      const bugReport: BugReport = {
        id: reportId,
        title,
        description,
        category,
        severity,
        steps,
        deviceInfo,
        appInfo,
        userEmail,
        attachments,
        timestamp: new Date(),
        status: 'pending'
      };

      // Add to queue
      this.reportQueue.push(bugReport);
      await this.saveReportQueue();

      // Try to submit immediately if online
      if (this.isOnline) {
        await this.submitBugReport(reportId);
      }

      return reportId;
    } catch (error) {
      console.error('Error creating bug report:', error);
      throw error;
    }
  }

  async submitBugReport(reportId: string): Promise<boolean> {
    const report = this.reportQueue.find(r => r.id === reportId);
    if (!report) {
      throw new Error('Bug report not found');
    }

    try {
      // Try multiple submission methods
      const success = await this.submitViaEmail(report) || 
                     await this.submitViaAPI(report) ||
                     await this.submitViaShare(report);

      if (success) {
        report.status = 'submitted';
        await this.saveReportQueue();
      }

      return success;
    } catch (error) {
      console.error('Error submitting bug report:', error);
      return false;
    }
  }

  private async submitViaEmail(report: BugReport): Promise<boolean> {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        return false;
      }

      const subject = `[Bug Report] ${report.category.toUpperCase()}: ${report.title}`;
      const body = this.formatEmailBody(report);

      const result = await MailComposer.composeAsync({
        recipients: ['bugs@pricetrackerpro.com'], // Replace with your support email
        subject,
        body,
        isHtml: true,
        attachments: report.attachments
      });

      return result.status === MailComposer.MailComposerStatus.SENT;
    } catch (error) {
      console.error('Email submission failed:', error);
      return false;
    }
  }

  private async submitViaAPI(report: BugReport): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('report', JSON.stringify({
        ...report,
        attachments: [] // Will be uploaded separately
      }));

      // Upload attachments
      for (const attachment of report.attachments) {
        const fileName = attachment.split('/').pop() || 'attachment';
        formData.append('attachments', {
          uri: attachment,
          type: attachment.includes('.png') ? 'image/png' : 'text/plain',
          name: fileName
        } as any);
      }

      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('API submission failed:', error);
      return false;
    }
  }

  private async submitViaShare(report: BugReport): Promise<boolean> {
    try {
      const reportFile = await this.generateReportFile(report);
      if (!reportFile) return false;

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) return false;

      await Sharing.shareAsync(reportFile, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Bug Report',
        UTI: 'public.plain-text'
      });

      return true;
    } catch (error) {
      console.error('Share submission failed:', error);
      return false;
    }
  }

  private async captureScreenshot(viewRef: any): Promise<string | null> {
    try {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 0.8,
        result: 'tmpfile'
      });

      // Save to permanent location
      const fileName = `screenshot_${Date.now()}.png`;
      const permanentUri = `${FileSystem.documentDirectory}bug_reports/${fileName}`;
      
      // Ensure directory exists
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}bug_reports/`,
        { intermediates: true }
      );

      await FileSystem.copyAsync({
        from: uri,
        to: permanentUri
      });

      return permanentUri;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
    }
  }

  private async generateSystemInfoFile(deviceInfo: DeviceInfo, appInfo: AppInfo): Promise<string | null> {
    try {
      const systemInfo = {
        timestamp: new Date().toISOString(),
        device: deviceInfo,
        app: appInfo,
        performance: await this.getPerformanceInfo(),
        storage: await this.getStorageInfo(),
        network: this.getNetworkInfo()
      };

      const fileName = `system_info_${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}bug_reports/${fileName}`;
      
      // Ensure directory exists
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}bug_reports/`,
        { intermediates: true }
      );

      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(systemInfo, null, 2)
      );

      return fileUri;
    } catch (error) {
      console.error('System info generation failed:', error);
      return null;
    }
  }

  private async generateReportFile(report: BugReport): Promise<string | null> {
    try {
      const reportText = `
BUG REPORT
==========

ID: ${report.id}
Title: ${report.title}
Category: ${report.category}
Severity: ${report.severity}
Timestamp: ${report.timestamp.toISOString()}

Description:
${report.description}

Steps to Reproduce:
${report.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Device Information:
- Platform: ${report.deviceInfo.platform}
- OS: ${report.deviceInfo.osName} ${report.deviceInfo.osVersion}
- Device: ${report.deviceInfo.manufacturer} ${report.deviceInfo.modelName}
- Screen: ${report.deviceInfo.screenDimensions.width}x${report.deviceInfo.screenDimensions.height}

App Information:
- Version: ${report.appInfo.appVersion}
- Build: ${report.appInfo.buildVersion}
- SDK: ${report.appInfo.sdkVersion}
- Session: ${report.appInfo.sessionId}

${report.userEmail ? `Contact: ${report.userEmail}` : ''}

Attachments: ${report.attachments.length} file(s)
${report.attachments.map(a => `- ${a.split('/').pop()}`).join('\n')}
      `;

      const fileName = `bug_report_${report.id}.txt`;
      const fileUri = `${FileSystem.documentDirectory}bug_reports/${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, reportText);
      return fileUri;
    } catch (error) {
      console.error('Report file generation failed:', error);
      return null;
    }
  }

  private formatEmailBody(report: BugReport): string {
    return `
      <html>
        <body>
          <h2>Bug Report: ${report.title}</h2>
          
          <h3>Details</h3>
          <ul>
            <li><strong>Category:</strong> ${report.category}</li>
            <li><strong>Severity:</strong> ${report.severity}</li>
            <li><strong>Timestamp:</strong> ${report.timestamp.toISOString()}</li>
            <li><strong>Report ID:</strong> ${report.id}</li>
          </ul>

          <h3>Description</h3>
          <p>${report.description.replace(/\n/g, '<br>')}</p>

          <h3>Steps to Reproduce</h3>
          <ol>
            ${report.steps.map(step => `<li>${step}</li>`).join('')}
          </ol>

          <h3>Device Information</h3>
          <ul>
            <li><strong>Platform:</strong> ${report.deviceInfo.platform}</li>
            <li><strong>OS:</strong> ${report.deviceInfo.osName} ${report.deviceInfo.osVersion}</li>
            <li><strong>Device:</strong> ${report.deviceInfo.manufacturer} ${report.deviceInfo.modelName}</li>
            <li><strong>Screen:</strong> ${report.deviceInfo.screenDimensions.width}x${report.deviceInfo.screenDimensions.height}</li>
          </ul>

          <h3>App Information</h3>
          <ul>
            <li><strong>Version:</strong> ${report.appInfo.appVersion}</li>
            <li><strong>Build:</strong> ${report.appInfo.buildVersion}</li>
            <li><strong>SDK:</strong> ${report.appInfo.sdkVersion}</li>
            <li><strong>Session:</strong> ${report.appInfo.sessionId}</li>
          </ul>

          ${report.userEmail ? `<p><strong>User Contact:</strong> ${report.userEmail}</p>` : ''}
        </body>
      </html>
    `;
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    const { width, height, scale } = Dimensions.get('window');
    
    return {
      brand: Device.brand || undefined,
      manufacturer: Device.manufacturer || undefined,
      modelName: Device.modelName || undefined,
      modelId: Device.modelId || undefined,
      deviceName: Device.deviceName || undefined,
      osName: Device.osName || undefined,
      osVersion: Device.osVersion || undefined,
      osBuildId: Device.osBuildId || undefined,
      totalMemory: Device.totalMemory || undefined,
      platform: Platform.OS,
      isDevice: Device.isDevice,
      screenDimensions: { width, height, scale }
    };
  }

  private async getAppInfo(): Promise<AppInfo> {
    return {
      appVersion: Constants.expoConfig?.version || '1.0.0',
      buildVersion: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '1',
      sdkVersion: Constants.expoConfig?.sdkVersion || 'unknown',
      expoVersion: Constants.expoConfig?.version || 'unknown',
      bundleId: Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package,
      debugMode: __DEV__,
      deviceId: Constants.deviceId,
      sessionId: this.sessionId
    };
  }

  private async getPerformanceInfo(): Promise<any> {
    return {
      timestamp: Date.now(),
      memoryUsage: (performance as any)?.memory || {},
      timing: (performance as any)?.timing || {}
    };
  }

  private async getStorageInfo(): Promise<any> {
    try {
      const storageInfo = await FileSystem.getFreeDiskStorageAsync();
      return {
        totalSize: storageInfo,
        availableSize: storageInfo,
        usedSize: 0 // Note: FileSystem.getFreeDiskStorageAsync only returns available space
      };
    } catch (error) {
      return { error: 'Unable to get storage info' };
    }
  }

  private getNetworkInfo(): any {
    return {
      userAgent: navigator.userAgent,
      onLine: navigator.onLine,
      connection: (navigator as any).connection || {}
    };
  }

  async getPendingReports(): Promise<BugReport[]> {
    return this.reportQueue.filter(report => report.status === 'pending');
  }

  async getAllReports(): Promise<BugReport[]> {
    return [...this.reportQueue];
  }

  async deleteReport(reportId: string): Promise<boolean> {
    const index = this.reportQueue.findIndex(r => r.id === reportId);
    if (index === -1) return false;

    // Delete attachments
    const report = this.reportQueue[index];
    for (const attachment of report.attachments) {
      try {
        await FileSystem.deleteAsync(attachment, { idempotent: true });
      } catch (error) {
        console.warn('Failed to delete attachment:', attachment, error);
      }
    }

    // Remove from queue
    this.reportQueue.splice(index, 1);
    await this.saveReportQueue();
    return true;
  }

  async retryPendingReports(): Promise<number> {
    const pendingReports = this.getPendingReports();
    let successCount = 0;

    for (const report of await pendingReports) {
      try {
        const success = await this.submitBugReport(report.id);
        if (success) successCount++;
      } catch (error) {
        console.warn('Failed to retry report:', report.id, error);
      }
    }

    return successCount;
  }

  // Quick report templates
  getReportTemplates(): BugReportTemplate[] {
    return [
      {
        category: 'crash',
        title: 'App crashes when [action]',
        description: 'The app suddenly closes when I try to [describe action]. This happens consistently.',
        commonSteps: [
          'Open the app',
          'Navigate to [screen/feature]',
          'Perform [specific action]',
          'App crashes/closes'
        ],
        severity: 'high'
      },
      {
        category: 'ui_bug',
        title: 'UI element not displaying correctly',
        description: 'A button/text/image is not showing properly on [screen name].',
        commonSteps: [
          'Open the app',
          'Navigate to [screen name]',
          'Observe the UI issue'
        ],
        severity: 'medium'
      },
      {
        category: 'performance',
        title: 'App is slow/laggy',
        description: 'The app feels slow and unresponsive when [describe scenario].',
        commonSteps: [
          'Open the app',
          'Navigate around the app',
          'Notice slow performance'
        ],
        severity: 'medium'
      },
      {
        category: 'feature_request',
        title: 'Feature request: [feature name]',
        description: 'I would like to request a new feature that would [describe benefit].',
        commonSteps: [
          'Current workflow that could be improved',
          'Suggested improvement'
        ],
        severity: 'low'
      }
    ];
  }

  private async loadReportQueue(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('bug_report_queue');
      if (saved) {
        this.reportQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load report queue:', error);
    }
  }

  private async saveReportQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('bug_report_queue', JSON.stringify(this.reportQueue));
    } catch (error) {
      console.error('Failed to save report queue:', error);
    }
  }

  // Automatic crash reporting
  setupAutomaticCrashReporting(): void {
    // Set up global error handler
    const originalHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      if (isFatal) {
        this.reportCrash(error);
      }
      originalHandler(error, isFatal);
    });

    // Set up unhandled promise rejection handler
    const promiseRejectionHandler = (event: any) => {
      this.reportUnhandledRejection(event.reason);
    };

    (global as any).addEventListener?.('unhandledrejection', promiseRejectionHandler);
  }

  private async reportCrash(error: Error): Promise<void> {
    try {
      await this.createBugReport(
        `Crash: ${error.name}`,
        `Fatal error occurred: ${error.message}\n\nStack trace:\n${error.stack}`,
        'crash',
        'critical',
        ['App crashed automatically'],
        undefined,
        undefined
      );
    } catch (reportError) {
      console.error('Failed to create crash report:', reportError);
    }
  }

  private async reportUnhandledRejection(reason: any): Promise<void> {
    try {
      const description = reason instanceof Error 
        ? `${reason.message}\n\nStack trace:\n${reason.stack}`
        : `Unhandled promise rejection: ${String(reason)}`;

      await this.createBugReport(
        'Unhandled Promise Rejection',
        description,
        'crash',
        'high',
        ['Promise rejected without handler'],
        undefined,
        undefined
      );
    } catch (reportError) {
      console.error('Failed to create rejection report:', reportError);
    }
  }
}

export const bugReportingService = new BugReportingService();