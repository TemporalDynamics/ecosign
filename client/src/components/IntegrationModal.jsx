// client/src/components/IntegrationModal.jsx
import React, { useState } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Shield from 'lucide-react/dist/esm/icons/shield';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';

const IntegrationModal = ({ isOpen, onClose, integrationData, onConfirm }) => {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  if (!isOpen || !integrationData) return null;

  // In a real implementation, you would integrate with Stripe.js here
  // For now, we'll simulate the payment using the client_secret from the backend
  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // In a real implementation, we would:
      // 1. Load Stripe.js
      // 2. Create payment method
      // 3. Confirm payment with the client_secret from integrationData
      // 4. Handle the result
      
      // For simulation, we'll proceed directly to confirmation
      // In a real app, you would use Stripe's payment confirmation process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call the confirmation function with payment information
      await onConfirm({
        ...integrationData,
        paymentMethod,
        status: 'processing'
      });
      
      setPaymentComplete(true);
      
      // Close the modal after successful payment
      setTimeout(() => {
        setPaymentComplete(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentComplete) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
          <div className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-600">
              Your {integrationData.service === 'mifiel' ? 'Mifiel certificate' : 'SignNow e-signature'} 
              request has been processed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-100 p-2 rounded-lg">
              {integrationData.service === 'mifiel' ? (
                <Shield className="w-6 h-6 text-black" />
              ) : (
                <FileText className="w-6 h-6 text-black" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {integrationData.service === 'mifiel' ? 'Mifiel Certificate' : 'SignNow e-Signature'}
              </h3>
              <p className="text-sm text-gray-600">{integrationData.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Pricing Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-900">Amount</span>
              <span className="text-2xl font-bold text-black">
                ${integrationData.amount} {integrationData.currency}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              One-time payment for {integrationData.description.toLowerCase()}
            </p>
          </div>

          {/* Requirements/Features */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              {integrationData.service === 'mifiel' ? 'Requirements' : 'Features'}
            </h4>
            <ul className="space-y-2">
              {(integrationData.service === 'mifiel' 
                ? integrationData.requirements 
                : integrationData.features
              )?.map((item, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Payment Method</h4>
            <div className="space-y-2">
              {integrationData.payment_options?.stripe && (
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={isProcessing}
                    className="mr-3"
                  />
                  <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                  <span className="text-gray-700">Credit/Debit Card</span>
                </label>
              )}
              {integrationData.payment_options?.paypal && (
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={isProcessing}
                    className="mr-3"
                  />
                  <span className="text-gray-700 font-medium">PayPal</span>
                </label>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-black to-gray-800 hover:bg-gray-800  text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </span>
              ) : (
                `Pay $${integrationData.amount}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationModal;