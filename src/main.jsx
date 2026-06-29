import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function VerifyPage() {
  const [discordId, setDiscordId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('discord_id');
    if (id) setDiscordId(id);
  }, []);

  const handleVerify = async () => {
    if (!discordId || !walletAddress) {
      setStatus('Please provide both details.');
      return;
    }
    
    const walletClean = walletAddress.trim();
    setStatus('Sending activity to backend...');

    // 1. Force an instant log to your Render backend right away!
    try {
      await fetch('https://near-bot-backend.onrender.com/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId, walletAddress: walletClean, logOnly: true })
      });
    } catch(err) {
      console.log("Initial log ping skipped");
    }

    setStatus('Checking NEAR Blockchain...');
    try {
      const argsBase64 = btoa(JSON.stringify({ account_id: walletClean }));
      
      const rpcResponse = await fetch('https://rpc.mainnet.near.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'dontcare',
          method: 'query',
          params: {
            request_type: 'call_function',
            finality: 'final',
            account_id: 'asac.near',
            method_name: 'nft_supply_for_owner',
            args_base64: argsBase64
          }
        })
      });
      
      const rpcData = await rpcResponse.json();
      
      let hasNft = false;
      if (rpcData.result && rpcData.result.result) {
        const bytesToText = String.fromCharCode(...rpcData.result.result);
        const balanceString = bytesToText.replace(/['"]+/g, ''); 
        const count = parseInt(balanceString, 10);
        
        if (!isNaN(count) && count > 0) {
          hasNft = true;
        } else {
          setStatus(`Failed: Contract reports ${balanceString} NFTs owned.`);
          // Send failure log to render before exiting
          await fetch('https://near-bot-backend.onrender.com/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordId, walletAddress: walletClean, hasNft: false })
          });
          return;
        }
      } else {
        setStatus('Failed: Invalid response from NEAR RPC.');
        return;
      }

      setStatus('NFT Found! Assigning your Discord role...');

      const response = await fetch('https://near-bot-backend.onrender.com/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId, walletAddress: walletClean, hasNft: true })
      });

      if (response.ok) {
        setStatus('Success! Verified.');
      } else {
        setStatus('Backend sync failed.');
      }
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center', color: '#fff', backgroundColor: '#111', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: '20px' }}>Link Your Wallet</h2>
      <input 
        type="text" 
        placeholder="Discord ID" 
        value={discordId} 
        onChange={e => setDiscordId(e.target.value)} 
        style={{ display: 'block', margin: '10px auto', padding: '12px', width: '80%', maxWidth: '300px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#222', color: '#fff' }} 
      />
      <input 
        type="text" 
        placeholder="NEAR Address" 
        value={walletAddress} 
        onChange={e => setWalletAddress(e.target.value)} 
        style={{ display: 'block', margin: '10px auto', padding: '12px', width: '80%', maxWidth: '300px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#222', color: '#fff' }} 
      />
      <button 
        onClick={handleVerify} 
        style={{ padding: '12px 24px', backgroundColor: '#00ec5b', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: '#000', cursor: 'pointer', marginTop: '15px' }}
      >
        Verify Now
      </button>
      <p style={{ marginTop: '20px', fontSize: '14px', color: '#aaa' }}>{status}</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VerifyPage />
  </React.StrictMode>
);
