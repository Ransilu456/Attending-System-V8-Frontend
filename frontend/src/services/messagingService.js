import api from './api';
import ToastHelper from '../components/ToastHelper';

// Helper function to check server connectivity
const checkServerConnectivity = async () => {
  try {
    await api.get('/whatsapp/health', { timeout: 3000 });
    return true;
  } catch (error) {
    console.warn('Server connection check failed:', error.message);
    return false;
  }
};

const checkWhatsAppConnection = async () => {
  try {
    const response = await api.get('/whatsapp/status');
    if (!response.data?.status?.isReady) {
      throw new Error('WhatsApp is not connected. Please scan the QR code to connect.');
    }
    return true;
  } catch (error) {
    console.warn('WhatsApp connection check failed:', error.message);
    return false;
  }
};

const messagingService = {
    MESSAGE_TYPES: {
      TEXT: 'manual',
      ATTENDANCE: 'attendance',
      NOTIFICATION: 'notification', 
      SYSTEM: 'system',
      TEMPLATE: 'template',
      TEST: 'test',
      AUTOMATED: 'automated'
    },
  
    formatAttendanceMessage: (studentData) => {
      const status = studentData.status === 'entered' ? 'Entered School' :
                    studentData.status === 'left' ? 'Left School' :
                    studentData.status === 'late' ? 'Arrived Late' : 'Marked Present';
      
      const timestamp = new Date(studentData.timestamp || studentData.entryTime).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone: 'Asia/Colombo'
      });
  
      return `🏫 Attendance Update
  
  Student: ${studentData.name}
  Index Number: ${studentData.indexNumber}
  Status: ${status}
  Time: ${timestamp}
  
  Additional Details:
  Email: ${studentData.student_email || studentData.email}
  Parent Phone: ${studentData.parent_telephone}
  Address: ${studentData.address}`;
    },
  
    sendMessage: async (data) => {
      try {
        const toastId = ToastHelper.loading('Sending message...');
        
        // Check WhatsApp connection first
        const isConnected = await checkWhatsAppConnection();
        if (!isConnected) {
          ToastHelper.update(toastId, {
            render: 'WhatsApp is not connected. Please scan the QR code first.',
            type: 'error',
            isLoading: false,
            autoClose: 3000
          });
          throw new Error('WhatsApp not connected');
        }

        if (!data.phoneNumber) {
          ToastHelper.update(toastId, {
            render: 'Phone number is required',
            type: 'error',
            isLoading: false,
            autoClose: 3000
          });
          throw new Error('Phone number is required');
        }
        if (!data.message) {
          ToastHelper.update(toastId, {
            render: 'Message content is required',
            type: 'error',
            isLoading: false,
            autoClose: 3000
          });
          throw new Error('Message content is required');
        }
  
        // Format phone number
        let formattedPhone = data.phoneNumber.replace(/\s+/g, '');
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+' + formattedPhone;
        }
  
        const response = await api.post('/whatsapp/send', {
          phoneNumber: formattedPhone,
          message: data.message,
          type: data.type || 'test'
        });
  
        ToastHelper.update(toastId, {
          render: `Message sent successfully to ${formattedPhone}`,
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
  
        return response.data;
      } catch (error) {
        console.error('Error sending message:', error);
        
        // Handle different error types
        const errorMessage = error.response?.data?.message || error.message || 'Failed to send message';
        
        ToastHelper.update(toastId, {
          render: errorMessage,
          type: 'error',
          isLoading: false,
          autoClose: 3000
        });
        throw error;
      }
    },
  
    sendBulkMessages: async (data) => {
      try {
        const toastId = ToastHelper.loading('Sending bulk messages...');
        
        // Check WhatsApp connection first
        const isConnected = await checkWhatsAppConnection();
        if (!isConnected) {
          ToastHelper.update(toastId, {
            render: 'WhatsApp is not connected. Please scan the QR code first.',
            type: 'error',
            isLoading: false,
            autoClose: 3000
          });
          throw new Error('WhatsApp not connected');
        }
        
        // Validate inputs
        if (!data.studentIds || !Array.isArray(data.studentIds) || data.studentIds.length === 0) {
          ToastHelper.update(toastId, {
            render: 'No students selected for messaging',
            type: 'error',
            isLoading: false,
            autoClose: 3000
          });
          throw new Error('No students selected');
        }
        
        if (!data.message || !data.message.trim()) {
          ToastHelper.update(toastId, {
            render: 'Message content cannot be empty',
            type: 'error',
            isLoading: false,
            autoClose: 3000
          });
          throw new Error('Empty message');
        }
        
        const response = await api.post('/whatsapp/bulk', {
          studentIds: data.studentIds,
          message: data.message,
          type: data.type || 'notification'
        });
  
        const { summary } = response.data;
        ToastHelper.update(toastId, {
          render: `Messages sent: ${summary.successful} successful, ${summary.failed} failed`,
          type: summary.failed === 0 ? 'success' : 'warning',
          isLoading: false,
          autoClose: 5000
        });
  
        return response.data;
      } catch (error) {
        console.error('Error sending bulk messages:', error);
        
        const toastId = ToastHelper.loading('');
        ToastHelper.update(toastId, {
          render: error.response?.data?.message || 'Failed to send bulk messages',
          type: 'error',
          isLoading: false,
          autoClose: 3000
        });
        throw error;
      }
    },
  
    getWhatsAppStatus: async () => {
      try {
        const response = await api.get('/whatsapp/status');
        return response.data;
      } catch (error) {
        console.error('Error getting WhatsApp status:', error);
        throw error;
      }
    },
  
    /**
     * Get the QR code for WhatsApp authentication
     * @param {boolean} forceRefresh - Whether to force a refresh of the QR code
     * @returns {Promise} - Promise resolving to QR code data or error
     */    getQRCode: async (forceRefresh = false) => {
      try {
        // Always use POST for refresh, GET for normal QR retrieval
        const response = await api.post('/whatsapp/qr/refresh', { force: forceRefresh });
        
        // If we get a 200 response but no QR code and WhatsApp is not ready,
        // it means we need to wait and retry
        if (response.data?.success && !response.data?.qrCode && !response.data?.status?.isReady) {
          throw new Error('QR code not yet available');
        }
        
        return response.data;
      } catch (error) {
        console.error('Error getting WhatsApp QR code:', error);
        return {
          success: false,
          error: error.response?.data?.message || 'Failed to get QR code',
          shouldRetry: true
        };
      }
    },
    refreshQRCode: async () => {
      try {
        const isServerUp = await checkServerConnectivity();
        if (!isServerUp) {
          throw new Error('Server is not responding. Please check if the server is running.');
        }

        const response = await api.post('/whatsapp/qr/refresh');
        
        if (response.data?.success && !response.data?.qrCode && !response.data?.isConnected) {
          // If successful but no QR code and not connected, try getting QR code directly
          const qrResponse = await api.get('/whatsapp/qr');
          if (qrResponse.data.qrCode) {
            return qrResponse.data;
          }
        }

        return {
          ...response.data,
          shouldRetry: response.data.shouldRetry || false,
          retryAfter: response.data.retryAfter || 3
        };
      } catch (error) {
        console.error('Error refreshing QR code:', error);
        if (error.response?.data) {
          return {
            success: false,
            shouldRetry: true,
            retryAfter: error.response.data.retryAfter || 3,
            message: error.response.data.message || 'Failed to refresh QR code'
          };
        }
        throw error;
      }
    },
  
    initWhatsApp: async () => {
      try {
        const response = await api.post('/whatsapp/init');
        return response.data;
      } catch (error) {
        console.error('Error initializing WhatsApp:', error);
        throw error;
      }
    },
  
    logoutWhatsApp: async () => {
      try {
        const toastId = ToastHelper.loading('Logging out WhatsApp...');
        const response = await api.post('/whatsapp/logout');
        
        ToastHelper.update(toastId, {
          render: 'WhatsApp logged out successfully',
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
        
        // If response includes instructions for manual logout on phone
        if (response.data?.deviceInstructions) {
          ToastHelper.info('Please also disconnect this device from your WhatsApp mobile app', {
            autoClose: 8000
          });
        }
        
        return response.data;
      } catch (error) {
        console.error('Error logging out WhatsApp:', error);
        ToastHelper.error('Error logging out WhatsApp');
        throw error;
      }
    },
  
    checkPreviousDayMessages: async () => {
      try {
        const toastId = ToastHelper.loading('Checking previous day messages...');
        const response = await api.post('/whatsapp/check-previous');
        
        ToastHelper.update(toastId, {
          render: 'Previous day attendance check completed',
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
        
        return response.data;
      } catch (error) {
        console.error('Error checking previous day messages:', error);
        ToastHelper.error('Failed to check previous day messages');
        throw error;
      }
    },
  
    getStudentsForMessaging: async (search = '', page = 1, limit = 50) => {
      try {
        const response = await api.get('/whatsapp/students', {
          params: { search, page, limit }
        });
        return response.data;
      } catch (error) {
        console.error('Error getting students for messaging:', error);
        throw error;
      }
    },
  
    sendMessageToStudent: async (studentId, message, type = 'notification') => {
      try {
        // Check WhatsApp connection first
        const isConnected = await checkWhatsAppConnection();
        if (!isConnected) {
          ToastHelper.error('WhatsApp is not connected. Please scan the QR code first.');
          throw new Error('WhatsApp not connected');
        }
        
        const toastId = ToastHelper.loading('Sending message...');
        
        const response = await api.post('/whatsapp/send-to-student', {
          studentId,
          message,
          type
        });
        
        ToastHelper.update(toastId, {
          render: `Message sent successfully to ${response.data.student?.name || 'student'}`,
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
        
        return response.data;
      } catch (error) {
        console.error('Error sending message to student:', error);
        ToastHelper.error(error.response?.data?.message || 'Failed to send message to student');
        throw error;
      }
    },
  };

export default messagingService;