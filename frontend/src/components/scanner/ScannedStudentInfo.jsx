import React from 'react';
import { User, CreditCard, Mail, MapPin, MessageCircle, Clock } from 'lucide-react';

const ScannedStudentInfo = ({ student, attendance }) => {
  if (!student) return null;
  const status = attendance?.current?.status || attendance?.status || 'present';
  {/*const whatsAppStatus = attendance?.whatsAppNotification === 'Sent' || 
                        attendance?.messageStatus === 'sent' ||
                        student?.messageStatus === 'sent' ? 'Sent' : 'Not Sent';*/}
  const timestamp = attendance?.timestamp || attendance?.entryTime || new Date().toLocaleTimeString();

  return (    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Student Details</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          status === 'entered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
          status === 'left' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
          status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5">
              <User size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Name:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{student.name || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5">
              <CreditCard size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Index Number:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{student.indexNumber || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5">
              <Mail size={20} />
            </div>            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Email:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                {student?.student_email ? student.student_email : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5">
              <User size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Status:</p>
              <p className={`text-sm ${
                status === 'entered' ? 'text-green-600 dark:text-green-400' : 
                status === 'left' ? 'text-blue-600 dark:text-blue-400' :
                status === 'late' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5">
              <MapPin size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Address:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{student.address || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5">
              <Clock size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Time:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{timestamp}</p>
            </div>
          </div>

          {/*<div className="flex items-start">
            <div className="flex-shrink-0 w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5">
              <MessageCircle size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">WhatsApp Notification:</p>
              <div className="flex items-center">
                <p className={`text-sm ${whatsAppStatus === 'Sent' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {whatsAppStatus}
                </p>
                <div className={`ml-2 w-2 h-2 rounded-full ${
                  whatsAppStatus === 'Sent' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
              </div>
            </div>
          </div>*/}
        </div>
      </div>
    </div>
  );
};

export default ScannedStudentInfo; 