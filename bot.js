import { ethers } from 'ethers';
import dotenv from 'dotenv';

// 1. Muhitni yuklash
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.PRIVATE_RPC_URL || "https://polygon-rpc.com";

// 2. Blokcheyn ulanishi
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Kontrakt va hamyon manzillari
const CONTRACT_ADDRESS = "0xddaAd340b0f1Ef65169Ae5E41A8b10776a75482d"; // Siz bergan manzil o'rnatildi
const MY_ADDRESS = "0xFBd3c01e589c1A85e4c77Bb84a2605f774E058ac";

// Tokenlar (Polygon Mainnet)
const USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

// Birja Routerlari
const QUICK_ROUTER = "0xa5E0829CaCEd8fFDD03942104615C1a7f99ee7ce";
const SUSHI_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";

// 3. Kontrakt ABI
const ABI = [
    "function executeArbitrage(address tokenA, address tokenB, uint256 amount, uint256 minProfit, address router1, address router2)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

async function startInvisibleHunt() {
    if (!PRIVATE_KEY) {
        console.log("❌ Xato: .env faylida PRIVATE_KEY topilmadi!");
        return;
    }

    console.log(`🕵️‍♂️ 'Invisible' rejim yoqildi. RPC: ${RPC_URL}`);
    console.log(`🚀 Raketa tayyor: ${CONTRACT_ADDRESS}`);

    // Savdo miqdori: 10,000 USDC Flash Loan (USDC 6 ta nolga ega)
    const loanAmount = ethers.parseUnits("10000", 6);
    // Minimal foyda: 5 USDC
    const minProfit = ethers.parseUnits("5", 6);

    while (true) {
        try {
            console.log("🔄 Imkoniyat qidirilmoqda...");

            // Tranzaksiyani yuborish
            const tx = await contract.executeArbitrage(
                USDC, WETH, loanAmount, minProfit, QUICK_ROUTER, SUSHI_ROUTER,
                {
                    gasLimit: 1800000,
                    maxFeePerGas: ethers.parseUnits('350', 'gwei'),
                    maxPriorityFeePerGas: ethers.parseUnits('50', 'gwei')
                }
            );

            console.log(`✅ Raketa ko'rinmas yo'lakdan uchdi! Hash: ${tx.hash}`);

            // Natijani kutish
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log("💰 G'ALABA! Foyda hamyoningizga tushdi.");
            } else {
                console.log("⚠️ Revert: Bozor o'zgarib qoldi yoki foyda yetarli bo'lmadi.");
            }

        } catch (error) {
            if (error.message.includes("insufficient funds")) {
                console.log("❌ Xato: Hamyonda POL (gaz) yetarli emas!");
            } else {
                console.log(`⏳ Bozor kutilmoqda...`);
            }
            // 4 soniya kutish
            await new Promise(resolve => setTimeout(resolve, 4000));
        }
    }
}

startInvisibleHunt();
