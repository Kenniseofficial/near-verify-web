import React, { useState, useEffect } from 'react';

export default function VerifyPage() {
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
            setStatus('❌ Please provide both your Discord ID and NEAR Wallet Address.');
            return;
        }

        setStatus('🔄 Checking NFT balance and updating database...');

        try {
            const argsBase64 = btoa(JSON.stringify({ account_id: walletAddress }));
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
                const balanceString = JSON.parse(String.fromCharCode(...rpcData.result.result));
                if (parseInt(balanceString) > 0) {
                    hasNft = true;
                }
            }

            if (!hasNft) {
                setStatus('❌ Verification failed: You do not own the required NFT.');
                return;
            }

            const backendUrl = 'https://near-bot-backend.onrender.com/verify'; 

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    discordId: discordId,
                    walletAddress: walletAddress,
                    hasNft: true
                })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('🎉 Success! Your role has been assigned and saved to the database.');
            } else {
                setStatus(`❌ Error: ${data.error || 'Failed to sync with server.'}`);
            }

        } catch (error) {
            console.error(error);
            setStatus('❌ Network error connecting to verification services.');
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '400px', margin: 'auto', textAlign: 'center' }}>
            <h2>🔒 Link Your Wallet</h2>
            <p>Enter your details below to claim your Discord role.</p>
            <input 
                type="text" 
                placeholder="Discord User ID" 
                value={discordId} 
                onChange={(e) => setDiscordId(e.target.value)} 
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            <input 
                type="text" 
                placeholder="NEAR Wallet Address (e.g., user.near)" 
                value={walletAddress} 
                onChange={(e) => setWalletAddress(e.target.value)} 
                style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
            />
            <button onClick={handleVerify} style={{ padding: '10px 20px', backgroundColor: '#00ec5b', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                Verify & Assign Role
            </button>
            <p style={{ marginTop: '20px', fontWeight: 'bold' }}>{status}</p>
        </div>
    );
}
