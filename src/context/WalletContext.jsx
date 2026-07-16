import React, { createContext, useContext, useState, useEffect } from 'react';
import { isConnected as isFreighterConnected, requestAccess } from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

const WalletContext = createContext();

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [publicKey, setPublicKey] = useState(null);
  const [balance, setBalance] = useState('0.00');
  const [walletType, setWalletType] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const fetchBalance = async (address) => {
    try {
      const account = await server.loadAccount(address);
      const xlmBalance = account.balances.find(b => b.asset_type === 'native');
      return xlmBalance ? parseFloat(xlmBalance.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    } catch (e) {
      console.error("Error fetching balance:", e);
      return '0.00';
    }
  };

  const connectWallet = async (type) => {
    console.log(`Attempting real connection to ${type}...`);
    
    try {
      if (type === 'freighter') {
        const connected = await isFreighterConnected();
        
        if (!connected) {
          alert("Freighter extension not detected or locked.");
          return;
        }

        const result = await requestAccess();
        console.log("Public Key result:", result);

        const pk = typeof result === 'string' ? result : result?.address;

        if (pk) {
          setPublicKey(pk);
          setWalletType(type);
          setIsConnected(true);
          
          const realBalance = await fetchBalance(pk);
          setBalance(realBalance);
          
          localStorage.setItem('dashy_wallet', JSON.stringify({ key: pk, type }));
        } else {
          alert("Connection cancelled or Public Key not shared.");
        }
      } else if (type === 'albedo') {
        // Real Albedo connection using the Albedo Web API
        console.log("Connecting to Albedo...");
        
        // Albedo doesn't require an NPM package for basic use if we use the browser API or its helper
        // We can use the albedo.link signer as a fallback
        const albedo = window.albedo;
        if (albedo) {
          try {
            const res = await albedo.publicKey({});
            const pk = res.pubkey;
            if (pk) {
              setPublicKey(pk);
              setWalletType(type);
              setIsConnected(true);
              const realBalance = await fetchBalance(pk);
              setBalance(realBalance);
              localStorage.setItem('dashy_wallet', JSON.stringify({ key: pk, type }));
            }
          } catch (e) {
            console.error("Albedo error:", e);
            alert("Albedo connection failed.");
          }
        } else {
          // Fallback to albedo.link web intent if no extension
          window.open(`https://albedo.link/_/public_key`, 'albedo', 'width=500,height=600');
          alert("Please follow the instructions in the Albedo popup. (Real-time sync requires the Albedo extension)");
        }
      } else if (type === 'xbull') {
        console.log("Connecting to xBull...");
        const xBull = window.xBullSDK;
        if (xBull) {
          try {
            const pk = await xBull.getPublicKey();
            if (pk) {
              setPublicKey(pk);
              setWalletType(type);
              setIsConnected(true);
              const realBalance = await fetchBalance(pk);
              setBalance(realBalance);
              localStorage.setItem('dashy_wallet', JSON.stringify({ key: pk, type }));
            }
          } catch (e) {
            console.error("xBull error:", e);
            alert("xBull connection failed.");
          }
        } else {
          alert("xBull wallet extension not detected.");
        }
      } else if (type === 'rabe') {
        console.log("Connecting to Rabe...");
        const rabe = window.rabe;
        if (rabe) {
          try {
            const res = await rabe.getPublicKey();
            if (res) {
              setPublicKey(res);
              setWalletType(type);
              setIsConnected(true);
              const realBalance = await fetchBalance(res);
              setBalance(realBalance);
              localStorage.setItem('dashy_wallet', JSON.stringify({ key: res, type }));
            }
          } catch (e) {
            console.error("Rabe error:", e);
            alert("Rabe connection failed.");
          }
        } else {
          alert("Rabe wallet extension not detected.");
        }
      } else if (type === 'privatekey') {
        const secretKey = prompt("Please enter your Stellar Secret Key (starts with S):");
        if (secretKey) {
          try {
            const keypair = StellarSdk.Keypair.fromSecret(secretKey);
            const pk = keypair.publicKey();
            setPublicKey(pk);
            setWalletType(type);
            setIsConnected(true);
            const realBalance = await fetchBalance(pk);
            setBalance(realBalance);
            localStorage.setItem('dashy_wallet', JSON.stringify({ key: pk, type }));
            console.log("Private Key connection successful.");
          } catch (e) {
            alert("Invalid Secret Key format.");
          }
        }
      } else {
        alert("Wallet provider protocol not recognized.");
      }
    } catch (error) {
      console.error("Connection error:", error);
      alert("Connection failed: " + error.message);
    }
  };

  const disconnectWallet = () => {
    setPublicKey(null);
    setBalance('0.00');
    setWalletType(null);
    setIsConnected(false);
    localStorage.removeItem('dashy_wallet');
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const saved = localStorage.getItem('dashy_wallet');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.key) {
            setPublicKey(parsed.key);
            setWalletType(parsed.type || 'freighter');
            setIsConnected(true);
            
            const realBalance = await fetchBalance(parsed.key);
            setBalance(realBalance);
          }
        }
      } finally {
        setIsInitializing(false);
      }
    };
    
    restoreSession();
  }, []);

  const callContract = async (contractId, method, args = [], readOnly = false) => {
    try {
      if (!publicKey && !readOnly) throw new Error("Wallet not connected");

      const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
      const rpcServer = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
      
      const effectivePublicKey = publicKey || "GCJ54H57MA5BO7EZQRLCEXFVKQI5RFIXLXP6IWIQLB6SN2WOEOHGRU46"; // Admin key as dummy for simulation

      
      // Convert simple args to ScVal
      const serializedArgs = args.map(arg => {
        // Explicit type hint: { type: 'u64'|'u32'|'i128'|..., value: bigint|number }
        if (arg && typeof arg === 'object' && arg.type && arg.value !== undefined) {
          return StellarSdk.nativeToScVal(arg.value, { type: arg.type });
        }
        if (typeof arg === 'string') {
          const trimmed = arg.trim();
          if ((trimmed.startsWith('C') || trimmed.startsWith('G')) && trimmed.length > 50) {
            try {
              return StellarSdk.Address.fromString(trimmed).toScVal();
            } catch (e) {
              console.warn("Address conversion failed for:", trimmed, e);
              return StellarSdk.nativeToScVal(trimmed);
            }
          }
          return StellarSdk.xdr.ScVal.scvSymbol(trimmed);
        }
        if (typeof arg === 'bigint') {
          // Default bigint → u64 (most contract counters/IDs are u64)
          return StellarSdk.nativeToScVal(arg, { type: 'u64' });
        }
        return StellarSdk.nativeToScVal(arg);
      });

      // 1. Prepare Transaction
      const account = await server.loadAccount(effectivePublicKey);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "2000000", // 0.2 XLM Base Fee for complex Soroban calls
        networkPassphrase: StellarSdk.Networks.TESTNET
      })
      .addOperation(StellarSdk.Operation.invokeContractFunction({
        contract: contractId,
        function: method,
        args: serializedArgs
      }))
      .setTimeout(30)
      .build();

      if (readOnly) {
         const simResponse = await rpcServer.simulateTransaction(tx);
         if (StellarSdk.rpc.Api.isSimulationError(simResponse)) {
            throw new Error(`Simulation failed: ${simResponse.error}`);
         }
         
         if (simResponse.result && simResponse.result.retval) {
            return { result: StellarSdk.scValToNative(simResponse.result.retval) };
         }
         
         if (simResponse.results && simResponse.results.length > 0) {
            const retval = simResponse.results[0].xdr;
            return { result: StellarSdk.scValToNative(StellarSdk.xdr.ScVal.fromXDR(retval, 'base64')) };
         }

         return { result: null };
      }

      // 2. Prepare (Simulate & Assemble)
      const response = await rpcServer.prepareTransaction(tx);
      const preparedTx = (response.toXDR || response.toXdr) 
        ? response 
        : StellarSdk.rpc.assembleTransaction(tx, response);
      
      const getXDR = (t) => {
        if (typeof t === 'string') return t;
        try { return t.toXDR(); } catch (e) {
          try { return t.toXdr(); } catch (e2) {
            try { return t.toEnvelope().toXDR('base64'); } catch (e3) {
              throw new Error("Could not serialize transaction to XDR");
            }
          }
        }
      };

      const xdrToSign = getXDR(preparedTx);
      
      // 3. Sign
      let signedTx;
      if (walletType === 'freighter') {
        const { signTransaction } = await import("@stellar/freighter-api");
        const freighterRes = await signTransaction(xdrToSign, { 
          network: 'TESTNET',
          networkPassphrase: StellarSdk.Networks.TESTNET 
        });
        if (freighterRes.error) throw new Error(freighterRes.error);
        signedTx = StellarSdk.TransactionBuilder.fromXDR(freighterRes.signedTxXdr || freighterRes, StellarSdk.Networks.TESTNET);
      } else if (walletType === 'albedo') {
        const res = await window.albedo.tx({ xdr: xdrToSign, network: 'testnet' });
        signedTx = StellarSdk.TransactionBuilder.fromXDR(res.signed_envelope, StellarSdk.Networks.TESTNET);
      } else if (walletType === 'xbull') {
        const signedXdr = await window.xBullSDK.signTransaction(xdrToSign);
        signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET);
      } else if (walletType === 'privatekey') {
        const secret = prompt("Confirm your Secret Key to sign:");
        if (!secret) throw new Error("Secret key required to sign transaction");
        const kp = StellarSdk.Keypair.fromSecret(secret);
        const txToSign = typeof preparedTx === 'string' ? StellarSdk.TransactionBuilder.fromXDR(preparedTx, StellarSdk.Networks.TESTNET) : preparedTx;
        txToSign.sign(kp);
        signedTx = txToSign;
      } else {
        throw new Error("Signing not supported for this wallet type yet");
      }

      // 4. Submit
      const submission = await rpcServer.sendTransaction(signedTx);
      if (submission.status !== 'PENDING') {
        throw new Error(`Submission failed: ${submission.status}`);
      }

      // 5. Wait for result
      let result = await rpcServer.getTransaction(submission.hash);
      while (result.status === 'NOT_FOUND' || result.status === 'PENDING') {
        await new Promise(r => setTimeout(r, 2000));
        result = await rpcServer.getTransaction(submission.hash);
      }

      if (result.status === 'SUCCESS') {
        return { 
          hash: submission.hash, 
          result: result.returnValue ? StellarSdk.scValToNative(result.returnValue) : null 
        };
      } else {
        throw new Error(`Transaction failed: ${result.status}`);
      }
    } catch (e) {
      console.error("Contract call error:", e);
      throw e;
    }
  };

  return (
    <WalletContext.Provider value={{
      publicKey,
      balance,
      walletType,
      isConnected,
      isInitializing,
      connectWallet,
      disconnectWallet,
      callContract
    }}>
      {children}
    </WalletContext.Provider>
  );
};
