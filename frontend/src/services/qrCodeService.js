import api from './api';
import ToastHelper from '../components/ToastHelper';

const qrCodeService = {
  // QR Code Download
  downloadQRCode: async (studentId) => {
    try {
      const response = await api.get(`/admin/students/${studentId}/qr-code`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading QR code:', error);
      ToastHelper.error('Failed to download QR code');
      throw error;
    }
  },
  
  // Get QR code data for a student
  getStudentQRCode: async (studentId) => {
    try {
      if (!studentId) {
        throw new Error('Student ID is required');
      }
      
      try {
        // First attempt - try the regular endpoint
        const response = await api.get(`/qr/student/${studentId}`);
        
        // If response data contains a base64 image string, return it properly formatted
        if (response.data?.data && typeof response.data.data === 'string' && 
            response.data.data.startsWith('data:image')) {
          console.log('Found base64 image directly from API');
          return {
            data: response.data.data,
            success: true,
            imageFound: true
          };
        }
        
        return response.data;
      } catch (firstError) {
        if (firstError.response?.status === 404) {
          // If first endpoint returns 404, try the second approach - get image data
          try {
            const imageResponse = await api.get(`/admin/students/${studentId}/qr-code`, {
              responseType: 'blob'
            });
            
            // If successful, convert the blob to a data URL
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                // Create QR data object with image
                const qrData = {
                  _id: studentId,
                  qrImage: reader.result,
                  timestamp: new Date().toISOString()
                };
                resolve({ data: qrData, imageFound: true });
              };
              reader.readAsDataURL(imageResponse.data);
            });
          } catch (secondError) {
            console.error('Error fetching QR code image:', secondError);
            throw firstError; // Re-throw the original error if both approaches fail
          }
        } else {
          throw firstError; // Re-throw if it's not a 404 error
        }
      }
    } catch (error) {
      console.error('Error fetching QR code data:', error);
      return null;
    }
  },
  
  // Save QR code data for a student
  saveQRCode: async (studentId, qrData) => {
    try {
      if (!studentId || !qrData) {
        throw new Error('Student ID and QR data are required');
      }
      
      const response = await api.post(`/qr/student/${studentId}`, { qrData });
      return response.data;
    } catch (error) {
      console.error('Error saving QR code data:', error);
      // We'll handle this silently in the component
      throw error;
    }
  },
  
  // Get QR code by index number
  getQRCodeByIndex: async (indexNumber) => {
    try {
      if (!indexNumber) {
        throw new Error('Index number is required');
      }
      
      const response = await api.get(`/admin/students/qr-code/${indexNumber}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error getting QR code by index number:', error);
      ToastHelper.error('Failed to get QR code');
      throw error;
    }
  },

  // Get student details by ID or index number
  getStudentDetails: async (studentIdentifier) => {
    try {
      let response;
      
      // Check if it's a MongoDB ID (24 characters hex string)
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(studentIdentifier);
      
      if (isMongoId) {
        // Use the correct route for student profile
        response = await api.get(`/students/profile/${studentIdentifier}`);
      } else {
        // Fallback to search by index number
        response = await api.get('/admin/students', {
          params: { 
            indexNumber: studentIdentifier.toString().toUpperCase(),
            includeAttendance: true,
            includeProfile: true
          }
        });
      }

      let student;
      if (isMongoId) {
        student = response.data?.student || response.data;
      } else {
        const students = response.data?.students || response.data?.data || [];
        student = students.find(s => s.indexNumber?.toUpperCase() === studentIdentifier.toString().toUpperCase());
      }
      
      if (!student) {
        throw new Error('Student not found');
      }

      // Get today's attendance record if exists
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttendance = student.attendanceHistory?.find(record => {
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });

      return {
        ...student,
        todayAttendance,
        formattedDetails: {
          name: student.name || 'N/A',
          indexNumber: student.indexNumber || 'N/A',
          email: student.student_email || 'N/A',
          parentEmail: student.parent_email || 'N/A',
          telephone: student.parent_telephone || 'N/A',
          address: student.address || 'N/A',
          whatsappStatus: student.whatsappStatus || 'Not configured',
          lastNotification: student.lastNotification ? new Date(student.lastNotification).toLocaleString() : 'N/A',
          todayStatus: todayAttendance ? todayAttendance.status : 'Not marked',
          entryTime: todayAttendance?.entryTime ? new Date(todayAttendance.entryTime).toLocaleTimeString() : 'N/A',
          leaveTime: todayAttendance?.leaveTime ? new Date(todayAttendance.leaveTime).toLocaleTimeString() : 'N/A'
        }
      };
    } catch (error) {
      console.error('Error getting student details:', error);
      throw error;
    }
  },
  
  // Mark attendance with QR code data
  markAttendanceQR: async (qrData) => {
    try {
      if (!qrData) {
        throw new Error('QR code data is required');
      }
      
      const response = await api.post('/qr/markAttendanceQR', { 
        qrData,
        deviceInfo: navigator.userAgent,
        scanLocation: 'QR Scanner'
      });
      
      if (response.data.success) {
        const student = response.data.data.student;
        const attendance = response.data.data.attendance;
        const status = attendance.current?.status || 'present';
        
        ToastHelper.success(`QR Attendance: ${student.name} (${student.indexNumber}) has ${status === 'entered' ? 'entered' : status === 'left' ? 'left' : status}`);
        
        return {
          success: true,
          data: response.data.data
        };
      } else {
        ToastHelper.error(response.data.message || 'Failed to mark attendance');
        return {
          success: false,
          error: response.data.message,
          data: response.data.data
        };
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      ToastHelper.error(error.response?.data?.message || 'Failed to process QR code');
      throw error;
    }
  },
  
  // Search QR code
  searchQRCode: async (searchParams) => {
    try {
      const { name, indexNumber } = searchParams;
      if (!name && !indexNumber) {
        throw new Error('Either name or index number is required');
      }
      
      const response = await api.get('/students/search-qr', {
        params: searchParams
      });
      
      return response.data;
    } catch (error) {
      console.error('Error searching for QR code:', error);
      throw error;
    }
  },
  
  // Download QR code
  downloadQRCodeByParams: async (params) => {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await api.get(`/students/download-qr-code?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading QR code:', error);
      ToastHelper.error('Failed to download QR code');
      throw error;
    }
  }
};

export default qrCodeService;