import re

with open('src/components/deposit/InstitutionalDepositPage.tsx', 'r') as f:
    content = f.read()

# Add 'unavailable' to step type
content = content.replace("const [step, setStep] = useState<'methods' | 'form' | 'processing' | 'success'>('methods');", "const [step, setStep] = useState<'methods' | 'form' | 'processing' | 'success' | 'unavailable'>('methods');")

# In handleStartProcessing
start_proc = """    if (selectedMethod === 'card') {
      if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        alert("Please fill in all credit card details.");
        return;
      }
    }"""
new_start_proc = """    if (selectedMethod === 'card') {
      setStep('unavailable');
      return;
    }"""
content = content.replace(start_proc, new_start_proc)

# Add unavailable step rendering
unavailable_step = """
              {step === 'unavailable' && (
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
              )}
            </AnimatePresence>
"""
content = content.replace("            </AnimatePresence>", unavailable_step)

with open('src/components/deposit/InstitutionalDepositPage.tsx', 'w') as f:
    f.write(content)
