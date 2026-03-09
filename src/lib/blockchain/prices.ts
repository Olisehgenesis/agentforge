
export interface TokenInfo {
    symbol: string;
    address: string;
    name?: string;
}

export const MONITORED_TOKENS: TokenInfo[] = [
    { symbol: "AUDm", address: "0x7175504C455076F15c04A2F90a8e352281F492F9", name: "Mento Australian Dollar" },
    { symbol: "BRLm", address: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787", name: "Mento Brazilian Real" },
    { symbol: "CADm", address: "0xff4Ab19391af240c311c54200a492233052B6325", name: "Mento Canadian Dollar" },
    { symbol: "CHFm", address: "0xb55a79F398E759E43C95b979163f30eC87Ee131D", name: "Mento Swiss Franc" },
    { symbol: "COPm", address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA", name: "Mento Colombian Peso" },
    { symbol: "EURm", address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73", name: "Mento Euro" },
    { symbol: "GBPm", address: "0xCCF663b1fF11028f0b19058d0f7B674004a40746", name: "Mento British Pound" },
    { symbol: "GHSm", address: "0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313", name: "Mento Ghanaian Cedi" },
    { symbol: "JPYm", address: "0xc45eCF20f3CD864B32D9794d6f76814aE8892e20", name: "Mento Japanese Yen" },
    { symbol: "KESm", address: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0", name: "Mento Kenyan Shilling" },
    { symbol: "NGNm", address: "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71", name: "Mento Nigerian Naira" },
    { symbol: "PHPm", address: "0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B", name: "Mento Philippine Peso" },
    { symbol: "USDC", address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", name: "USDC" },
    { symbol: "USDm", address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", name: "Mento Dollar" },
    { symbol: "USDT", address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", name: "Tether USD" },
    { symbol: "WETH", address: "0xD221812de1BD094f35587EE8E174B07B6167D9Af", name: "Wrapped Ether" },
    { symbol: "XOFm", address: "0x73F93dcc49cB8A239e2032663e9475dd5ef29A08", name: "West African CFA" },
    { symbol: "ZARm", address: "0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6", name: "South African Rand" },
    { symbol: "UGXm", address: "0xc6f3f007e0F714B9526723b7e73D35B35C146244", name: "Mento Ugandan Shilling" }
];

export async function getDexPrice(address: string): Promise<number> {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (!data || !data.pairs || data.pairs.length === 0) {
        throw new Error("No pairs found on DexScreener");
    }
    const price = parseFloat(data.pairs[0].priceUsd);
    if (isNaN(price)) {
        throw new Error("DexScreener returned an invalid price format");
    }
    return price;
}

export async function getCoinGeckoPrice(address: string): Promise<number> {
    const url = `https://api.coingecko.com/api/v3/simple/token_price/celo?contract_addresses=${address}&vs_currencies=usd`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const tokenData = data[address.toLowerCase()];
    if (!tokenData || !tokenData.usd) {
        throw new Error("No price found on CoinGecko");
    }
    const price = parseFloat(tokenData.usd);
    if (isNaN(price)) {
        throw new Error("CoinGecko returned an invalid price format");
    }
    return price;
}

export async function getTokenPrice(symbol: string): Promise<number> {
    const token = MONITORED_TOKENS.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
    if (!token) {
        // Try as raw address if it looks like one
        if (symbol.startsWith("0x")) {
            return await getPriceWithFallbacks(symbol);
        }
        throw new Error(`Token ${symbol} not found in monitored list`);
    }
    return await getPriceWithFallbacks(token.address);
}

async function getPriceWithFallbacks(address: string): Promise<number> {
    const apis = [
        () => getDexPrice(address),
        () => getCoinGeckoPrice(address)
    ];

    let lastError = null;
    for (const api of apis) {
        try {
            return await api();
        } catch (e: any) {
            lastError = e;
            console.warn(`[Price API Warning] Request failed for ${address} → trying fallback. (${e.message})`);
        }
    }

    throw new Error(`All price APIs failed for ${address}. Last error: ${lastError?.message}`);
}
