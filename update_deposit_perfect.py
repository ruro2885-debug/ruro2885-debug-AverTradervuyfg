with open('src/components/deposit/InstitutionalDepositPage.tsx', 'r') as f:
    content = f.read()

# 1. Update cardStepsList and handleStartProcessing
old_card_steps_code = """  const cardStepsList = [
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
    }"""

new_card_steps_code = """  const cardStepsList = [
    'Connecting Secure Payment Gateway...',
    'Encrypting Card Information...',
    'Authorizing Card with Issuing Bank...',
    'Verifying 3D Secure Authentication...'
  ];

  const handleStartProcessing = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (selectedMethod === 'card') {
      setStep('processing');
      setProcessingStepIndex(0);

      const interval = setInterval(() => {
        setProcessingStepIndex(prev => {
          if (prev < cardStepsList.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            setTimeout(() => {
              setStep('unavailable');
            }, 800);
            return prev;
          }
        });
      }, 1200);
      return;
    }"""

content = content.replace(old_card_steps_code, new_card_steps_code)

# 2. Add type="button" to non-submit buttons in card form
content = content.replace(
    '<button \n                          onClick={() => setStep(\'methods\')} \n                          className="flex h-10 w-10',
    '<button \n                          type="button"\n                          onClick={() => setStep(\'methods\')} \n                          className="flex h-10 w-10'
)

content = content.replace(
    '<button \n                                key={amt} \n                                onClick={() => setAmount(amt)}',
    '<button \n                                type="button"\n                                key={amt} \n                                onClick={() => setAmount(amt)}'
)

# 3. Update Visa / Mastercard / AMEX badge design
old_badges = """<div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
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

new_badges = """<div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                                <div className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-black italic tracking-wider text-[#1A1F71] dark:text-blue-400 border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-sm">
                                  VISA
                                </div>
                                <div className="bg-slate-200 dark:bg-slate-800 px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-sm">
                                  <div className="flex items-center -space-x-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#EB001B]"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#F79E1B]"></div>
                                  </div>
                                </div>
                                <div className="bg-[#0070D2] px-1.5 py-0.5 rounded text-[9px] font-black tracking-tight text-white shadow-sm flex items-center justify-center">
                                  AMEX
                                </div>
                              </div>"""

content = content.replace(old_badges, new_badges)

# 4. Update the step === 'unavailable' screen back to the clean original design
old_unavail = """              {step === 'unavailable' && (
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

new_unavail = """              {step === 'unavailable' && (
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
                      Please choose another payment method or contact support.
                    </p>
                  </div>

                  <div className="pt-4 max-w-md mx-auto">
                    <button 
                      type="button"
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

content = content.replace(old_unavail, new_unavail)

with open('src/components/deposit/InstitutionalDepositPage.tsx', 'w') as f:
    f.write(content)

print("Updated deposit page script finished.")
