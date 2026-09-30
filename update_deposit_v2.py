import re

with open('src/components/deposit/InstitutionalDepositPage.tsx', 'r') as f:
    content = f.read()

# 1. Update preset amounts
content = content.replace("[1000, 5000, 10000, 50000]", "[1000, 3000, 5000, 10000]")

# 2. Update card badges styling in input field
old_badges = """<div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold tracking-tighter text-white ring-1 ring-white/10">VISA</span>
                                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold tracking-tighter text-amber-400 ring-1 ring-white/10">MC</span>
                                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold tracking-tighter text-blue-400 ring-1 ring-white/10">AMEX</span>
                              </div>"""

new_badges = """<div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                                <div className="bg-white/10 dark:bg-white/15 px-2 py-0.5 rounded text-[10px] font-black italic tracking-wider text-slate-100 ring-1 ring-white/15 flex items-center justify-center">
                                  VISA
                                </div>
                                <div className="bg-white/10 dark:bg-white/15 px-1.5 py-1 rounded ring-1 ring-white/15 flex items-center justify-center">
                                  <div className="flex items-center -space-x-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#EB001B]"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#F79E1B] opacity-90"></div>
                                  </div>
                                </div>
                                <div className="bg-[#0070D2] px-1.5 py-0.5 rounded text-[9px] font-black tracking-tight text-white shadow-sm flex items-center justify-center">
                                  AMEX
                                </div>
                              </div>"""

content = content.replace(old_badges, new_badges)

# 3. Update processing logic for Card Payments
card_processing_steps = """  const cardStepsList = [
    'Connecting Secure Payment Gateway...',
    'Encrypting Transaction Data...',
    'Authorizing Card with Issuing Bank...',
    'We are having trouble connecting your card...'
  ];"""

old_handle_start = """  const handleStartProcessing = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (selectedMethod === 'card') {
      setStep('unavailable');
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

new_handle_start = """  const cardStepsList = [
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

content = content.replace(old_handle_start, new_handle_start)

# Update step rendering heading when step === 'processing'
old_proc_header = "{processingStepsList[processingStepIndex]}"
new_proc_header = "{selectedMethod === 'card' ? cardStepsList[processingStepIndex] : processingStepsList[processingStepIndex]}"
content = content.replace(old_proc_header, new_proc_header)

old_proc_bar = "animate={{ width: `${((processingStepIndex + 1) / processingStepsList.length) * 100}%` }}"
new_proc_bar = "animate={{ width: `${((processingStepIndex + 1) / (selectedMethod === 'card' ? cardStepsList.length : processingStepsList.length)) * 100}%` }}"
content = content.replace(old_proc_bar, new_proc_bar)

# 4. Update step === 'unavailable' screen with Try Again, Choose Another Method, Contact Support
old_unavailable_view = """              {step === 'unavailable' && (
                <motion.div 
                  key="unavailable"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-12 rounded-[32px] border text-center space-y-8 ${
                    isDark ? 'bg-slate-900/90 border-white/10 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-2xl'
                  }`}
                >
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-neutral-500/10 border border-neutral-500/30 flex items-center justify-center text-neutral-400">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight">Card payments are currently unavailable</h2>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                      Please choose another payment method or contact support.
                    </p>
                  </div>
                  <div className="flex justify-center gap-4 pt-4">
                    <button 
                      onClick={() => setStep('methods')}
                      className={`px-8 py-4 rounded-2xl font-black text-sm transition-all ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      Return to Deposit Methods
                    </button>
                  </div>
                </motion.div>
              )}"""

new_unavailable_view = """              {step === 'unavailable' && (
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

content = content.replace(old_unavailable_view, new_unavailable_view)

with open('src/components/deposit/InstitutionalDepositPage.tsx', 'w') as f:
    f.write(content)

print("Update script executed successfully")
