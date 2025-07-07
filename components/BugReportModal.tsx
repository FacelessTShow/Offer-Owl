import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bugReportingService, BugReportTemplate } from '../services/bugReportingService';

interface BugReportModalProps {
  visible: boolean;
  onClose: () => void;
  screenshotRef?: any;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({
  visible,
  onClose,
  screenshotRef
}) => {
  const [step, setStep] = useState<'template' | 'form' | 'submitting' | 'success'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<BugReportTemplate | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other' as 'crash' | 'ui_bug' | 'performance' | 'feature_request' | 'other',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    steps: [''],
    userEmail: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const templates = bugReportingService.getReportTemplates();

  const resetForm = () => {
    setStep('template');
    setSelectedTemplate(null);
    setFormData({
      title: '',
      description: '',
      category: 'other',
      severity: 'medium',
      steps: [''],
      userEmail: '',
    });
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectTemplate = (template: BugReportTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      title: template.title,
      description: template.description,
      category: template.category as any,
      severity: template.severity,
      steps: [...template.commonSteps],
      userEmail: '',
    });
    setStep('form');
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, '']
    }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => i === index ? value : step)
    }));
  };

  const submitReport = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in the title and description.');
      return;
    }

    setIsSubmitting(true);
    setStep('submitting');

    try {
      const filteredSteps = formData.steps.filter(step => step.trim() !== '');
      
      const reportId = await bugReportingService.createBugReport(
        formData.title,
        formData.description,
        formData.category,
        formData.severity,
        filteredSteps,
        formData.userEmail || undefined,
        screenshotRef
      );

      console.log('Bug report created:', reportId);
      setStep('success');
      
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting bug report:', error);
      Alert.alert(
        'Error',
        'Failed to submit bug report. It has been saved locally and will be submitted when you\'re online.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTemplateSelection = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report an Issue</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Choose the type of issue you're experiencing:</Text>

      <ScrollView style={styles.templateList}>
        {templates.map((template, index) => (
          <TouchableOpacity
            key={index}
            style={styles.templateCard}
            onPress={() => selectTemplate(template)}
          >
            <View style={styles.templateHeader}>
              <Text style={styles.templateTitle}>{template.title}</Text>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(template.severity) }]}>
                <Text style={styles.severityText}>{template.severity}</Text>
              </View>
            </View>
            <Text style={styles.templateDescription}>{template.description}</Text>
            <View style={styles.templateFooter}>
              <Text style={styles.categoryText}>{template.category.replace('_', ' ')}</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.templateCard, styles.customTemplate]}
          onPress={() => {
            setStep('form');
            setSelectedTemplate(null);
          }}
        >
          <View style={styles.templateHeader}>
            <Text style={styles.templateTitle}>Custom Report</Text>
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </View>
          <Text style={styles.templateDescription}>
            Create a custom bug report with your own details
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderForm = () => (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('template')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Bug Report</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder="Brief description of the issue"
            maxLength={100}
          />
        </View>

        {/* Category & Severity */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => showCategoryPicker()}
              >
                <Text style={styles.pickerText}>
                  {formData.category.replace('_', ' ')}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Severity</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => showSeverityPicker()}
              >
                <Text style={styles.pickerText}>{formData.severity}</Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Detailed description of the issue..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        {/* Steps to Reproduce */}
        <View style={styles.formGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Steps to Reproduce</Text>
            <TouchableOpacity onPress={addStep} style={styles.addButton}>
              <Ionicons name="add" size={16} color="#007AFF" />
              <Text style={styles.addButtonText}>Add Step</Text>
            </TouchableOpacity>
          </View>
          
          {formData.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}.</Text>
              <TextInput
                style={[styles.input, styles.stepInput]}
                value={step}
                onChangeText={(text) => updateStep(index, text)}
                placeholder="Describe this step..."
                maxLength={200}
              />
              {formData.steps.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeStep(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="remove-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Email (Optional) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Your Email (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.userEmail}
            onChangeText={(text) => setFormData(prev => ({ ...prev, userEmail: text }))}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.helpText}>
            Provide your email if you'd like us to follow up on this report
          </Text>
        </View>

        {/* Screenshot Info */}
        {screenshotRef && (
          <View style={styles.infoCard}>
            <Ionicons name="camera" size={20} color="#34C759" />
            <Text style={styles.infoText}>
              A screenshot will be automatically attached to help us understand the issue
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={submitReport}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderSubmitting = () => (
    <View style={styles.statusContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.statusTitle}>Submitting Report...</Text>
      <Text style={styles.statusText}>
        Please wait while we process your bug report
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.statusContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={40} color="#FFF" />
      </View>
      <Text style={styles.statusTitle}>Report Submitted!</Text>
      <Text style={styles.statusText}>
        Thank you for helping us improve the app. We'll review your report and get back to you if needed.
      </Text>
    </View>
  );

  const showCategoryPicker = () => {
    const categories = [
      { label: 'Crash', value: 'crash' },
      { label: 'UI Bug', value: 'ui_bug' },
      { label: 'Performance', value: 'performance' },
      { label: 'Feature Request', value: 'feature_request' },
      { label: 'Other', value: 'other' },
    ];

    Alert.alert(
      'Select Category',
      '',
      categories.map(cat => ({
        text: cat.label,
        onPress: () => setFormData(prev => ({ ...prev, category: cat.value as any }))
      }))
    );
  };

  const showSeverityPicker = () => {
    const severities = [
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
      { label: 'Critical', value: 'critical' },
    ];

    Alert.alert(
      'Select Severity',
      '',
      severities.map(sev => ({
        text: sev.label,
        onPress: () => setFormData(prev => ({ ...prev, severity: sev.value as any }))
      }))
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#34C759';
      case 'medium': return '#FF9500';
      case 'high': return '#FF3B30';
      case 'critical': return '#8E0000';
      default: return '#007AFF';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.modal}>
        {step === 'template' && renderTemplateSelection()}
        {step === 'form' && renderForm()}
        {step === 'submitting' && renderSubmitting()}
        {step === 'success' && renderSuccess()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
  },
  templateList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  templateCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  customTemplate: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  templateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryText: {
    fontSize: 12,
    color: '#007AFF',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  pickerContainer: {
    position: 'relative',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 16,
    color: '#1D1D1F',
    textTransform: 'capitalize',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#007AFF',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    marginTop: 12,
    minWidth: 20,
  },
  stepInput: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    marginTop: 10,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1D6D3A',
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#B3D9FF',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 20,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BugReportModal;