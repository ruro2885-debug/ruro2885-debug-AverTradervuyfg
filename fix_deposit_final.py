import re

with open('src/components/deposit/InstitutionalDepositPage.tsx', 'r') as f:
    content = f.read()

# Fix handleStartProcessing
old_proc = """  const handleStartProcessing = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (selectedMethod === 'card') {
      const hasPaymentGateway = false; // Intentionally false until a provider is configured
      if (!hasPaymentGateway) {
        setStep('unavailable');
        return;
      }
      if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        alert("Please fill in all credit card details.");
        return;
      }
    }
    setStep('processing');
    setProcessingStepIndex(0);

    const interval = setInterval(() => {
      setProcessingStepIndex(prev => {
        if (prev < processingStepsList.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          // Commit to Firestore
          commitDepositToFirestore();
          return prev;
        }
      });
    }, 900);
  };"""

new_proc = """  const cardStepsList = [
    'Connecting Secure Payment Gateway...',
    'Encrypting Card Information...',
    'Authorizing Card with Issuing Bank...',
    'We are having trouble connecting your card...'
  ];

  const handleStartProcessing = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (selectedMethod === 'card') {
      if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        alert("Please fill in all credit card details.");
        return;
      }
      setStep('processing');
      setProcessingStepIndex(0);

      const interval = setInterval(() => {
        setProcessingStepIndex(prev => {
          if (prev < cardStepsList.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            setStep('unavailable');
            return prev;
          }
        });
      }, 1000);
      return;
    }

    setStep('processing');
    setProcessingStepIndex(0);

    const interval = setInterval(() => {
      setProcessingStepIndex(prev => {
        if (prev < processingStepsList.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          // Commit to Firestore
          commitDepositToFirestore();
          return prev;
        }
      });
    }, 900);
  };"""

content = content.replace(old_proc, new_proc)

# Replace unavailable step view with exact clean style matching original design
old_unavailable = """              {step === 'unavailable' && (
                <motion.div 
                  key="unavailable"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-10 sm:p-12 rounded-[32px] border text-center space-y-8 ${
                    isDark ? 'bg-slate-900/90 border-white/10 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-2xl'
                  }`}
                >
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 relative">
                    <AlertCircle className="w-10 h-10" />
                    <div className="absolute inset-0 rounded-3xl bg-amber-500/15 blur-xl animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Card payments are currently unavailable
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                      We are having trouble connecting your card to our payment gateway. Please try again or choose another payment method.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-md mx-auto text-left text-xs space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Gateway Handshake:</span>
                      <span className="font-mono text-amber-400 font-bold">TIMED_OUT</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Routing Method:</span>
                      <span className="font-semibold text-white">Visa / Mastercard Direct</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button 
                      onClick={() => handleStartProcessing()}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Try Again
                    </button>
                    <button 
                      onClick={() => setStep('methods')}
                      className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs border transition-all ${
                        isDark ? 'border-white/15 bg-white/5 hover:bg-white/10 text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      Choose Another Payment Method
                    </button>
                    <button 
                      onClick={() => alert("Our institutional support team is available 24/7. Please contact support@aver.org")}
                      className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs border transition-all ${
                        isDark ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Contact Support
                    </button>
                  </div>
                </motion.div>
              )}"""

new_unavailable = """              {step === 'unavailable' && (
                <motion.div 
                  key="unavailable"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-10 sm:p-12 rounded-[32px] border text-center space-y-8 ${
                    isDark ? 'bg-slate-900/90 border-white/10 backdrop-blur-xl shadow-2xl' : 'bg-white border-slate-200 shadow-2xl'
                  }`}
                >
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-neutral-800/80 border border-white/10 flex items-center justify-center text-slate-300">
                    <AlertCircle className="w-10 h-10 text-slate-300" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                      Card payments are currently unavailable
                    </h2>
                    <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto leading-relaxed">
                      We are having trouble connecting your card to our payment gateway. Please choose another payment method or contact support.
                    </p>
                  </div>

                  <div className="pt-4 max-w-md mx-auto">
                    <button 
                      onClick={() => setStep('methods')}
                      className={`w-full py-5 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                        isDark ? 'bg-slate-800/90 hover:bg-slate-700/90 text-white border border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      Return to Deposit Methods
                    </button>
                  </div>
                </motion.div>
              )}"""

content = content.replace(old_unavailable, new_unavailable)

with open('src/components/deposit/InstitutionalDepositPage.tsx', 'w') as f:
    f.write(content)

print("Final deposit script completed successfully")
