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
            setStatus('Please provide both details.');
            return;
        }
        setStatus('Checking...');
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
                if (parseInt(balanceString) > 0) hasNft = true;
            }

            if (!hasNft) {
                setStatus('Failed: No NFT owned.');
                return;
            }

            const response = await fetch('https://near-bot-backend.onrender.com/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discordId, walletAddress, hasNft: true })
            });

            if (response.ok) {
                setStatus('Success! Verified.');
            } else {
                setStatus('Sync error.');
            }
        } catch (e) {
            setStatus('Network error.');
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h2>Link Your Wallet</h2>
            <input type="text" placeholder="Discord ID" value={discordId} onChange={e => setDiscordId(e.target.value)} style={{ display: 'block', margin: '10px auto', padding: '8px' }} />
            <input type="text" placeholder="NEAR Address" value={walletAddress} onChange={e => setWalletAddress(e.target.value)} style={{ display: 'block', margin: '10px auto', padding: '8px' }} />
            <button onClick={handleVerify} style={{ padding: '10px', backgroundColor: '#00ec5b', border: 'none', fontWeight: 'bold' }}>Verify Now</button>
            <p>{status}</p>
        </div>
    );
}
