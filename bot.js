import os
import time
from web3 import Web3
from dotenv import load_dotenv

# 1. Muhitni yuklash
load_dotenv()
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
RPC_URL = os.getenv("PRIVATE_RPC_URL")

# 2. Blokcheyn ulanishi (Private RPC bilan)
# Agar private RPC-da muammo bo'lsa, oddiyiga ulanadi
web3 = Web3(Web3.HTTPProvider(RPC_URL or "https://polygon-rpc.com"))

# Kontrakt va hamyon manzillari
CONTRACT_ADDRESS = "0xf463088E8f697573E77b638ca6E824196EDa21fd"
MY_ADDRESS = "0xFBd3c01e589c1A85e4c77Bb84a2605f774E058ac"

# Tokenlar (Polygon Mainnet)
USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"

# Birja Routerlari
QUICK_ROUTER = "0xa5E0829CaCEd8fFDD03942104615C1a7f99ee7ce"
SUSHI_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"

# 3. Kontrakt ABI
ABI = [
    {
        "inputs": [
            {"name": "tokenA", "type": "address"},
            {"name": "tokenB", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "minProfit", "type": "uint256"},
            {"name": "router1", "type": "address"},
            {"name": "router2", "type": "address"}
        ],
        "name": "executeArbitrage",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)



def start_invisible_hunt():
    if not PRIVATE_KEY:
        print("❌ Xato: .env faylida PRIVATE_KEY topilmadi!")
        return

    print(f"🕵️‍♂️ 'Invisible' rejim yoqildi. RPC: {RPC_URL}")
    print(f"🚀 Raketa tayyor: {CONTRACT_ADDRESS}")
    
    # Savdo miqdori: 10,000 USDC Flash Loan
    loan_amount = 10000 * 10**6
    # Minimal foyda: 5 USDC (komissiyalardan tashqari)
    min_profit = 5 * 10**6 
    
    while True:
        try:
            # Tarmoq ulanishini tekshirish
            if not web3.is_connected():
                print("📡 Tarmoq bilan aloqa uzildi, qayta ulanish...")
                time.sleep(5)
                continue

            nonce = web3.eth.get_transaction_count(MY_ADDRESS)
            
            # Tranzaksiyani "Agressiv" gaz bilan qurish
            tx = contract.functions.executeArbitrage(
                USDC, WETH, loan_amount, min_profit, QUICK_ROUTER, SUSHI_ROUTER
            ).build_transaction({
                'from': MY_ADDRESS,
                'gas': 1800000, 
                'maxFeePerGas': web3.to_wei('350', 'gwei'), # Tezlik uchun baland narx
                'maxPriorityFeePerGas': web3.to_wei('50', 'gwei'),
                'nonce': nonce,
                'chainId': 137 
            })
            
            # Imzolash va Private RPC orqali yuborish
            signed_tx = web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            print(f"✅ Raketa ko'rinmas yo'lakdan uchdi! Hash: {web3.to_hex(tx_hash)}")
            
            # Natijani kutish (120 soniya)
            receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt.status == 1:
                print("💰 G'ALABA! Foyda hamyoningizga tushdi.")
            else:
                print("⚠️ Revert: Bozor o'zgarib qoldi yoki foyda yetarli bo'lmadi.")
            
        except Exception as e:
            # Bozor kutilayotganda terminalni tozalab turish uchun
            if "insufficient funds" in str(e).lower():
                print("❌ Xato: Hamyonda POL (gaz) yetarli emas!")
            else:
                print(f"⏳ Bozor kutilmoqda... (Izlash davom etmoqda)")
            
            time.sleep(4) # Polygon bloklari orasidagi vaqt

if name == "main":
    start_invisible_hunt()