from web3 import Web3
from web3.middleware import geth_poa_middleware
import time
import os
from dotenv import load_dotenv

# .env yuklash
load_dotenv()

# ==================== SOZLAMALAR ====================
RPC_URL = 'https://polygon-rpc.com'          # Polygon Mainnet (tez va ishonchli)
CHAIN_ID = 137                               # Polygon chain ID
MY_ADDRESS = os.getenv('MY_ADDRESS')
PRIVATE_KEY = os.getenv('PRIVATE_KEY')

CONTRACT_ADDRESS = '0xddaAd340b0f1Ef65169Ae5E41A8b10776a75482d'  # Siz so'ragan manzil

# ABI — muhim! Remixdan olingan ABI ni shu yerga qo'ying
# Agar sizda WhaleHunterV10 ABI bo'lsa — uni nusxalab qo'ying
# Quyidagi misol sizning oldingi kodingizga mos
ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "_target", "type": "address"},
            {"internalType": "uint256", "name": "_borrowAmount", "type": "uint256"},
            {"internalType": "address[]", "name": "_tokenPath", "type": "address[]"},
            {"internalType": "address[]", "name": "_routerPath", "type": "address[]"}
        ],
        "name": "executeStrike",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
    # Agar boshqa funksiyalar bo'lsa — qo'shing
]

# Polygon tokenlari (USDC 6 decimal, WETH 18 decimal)
USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
WETH = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'

QUICKSWAP_ROUTER = '0xa5E0829CaCEd8fFDD4De3c53AfeD7d1AebA5c8d9'   # QuickSwap V2
SUSHISWAP_ROUTER = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'   # SushiSwap

# Web3 ulanish
w3 = Web3(Web3.HTTPProvider(RPC_URL))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)  # Polygon uchun kerak

if not w3.is_connected():
    raise Exception("RPC ga ulanib bo'lmadi! Internetni tekshiring.")

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)

# ==================== FUNKSİYALAR ====================
def build_and_send_tx(function_call, gas_limit=800000, gas_multiplier=1.3):
    if not PRIVATE_KEY:
        raise ValueError("PRIVATE_KEY .env da yo'q! Qo'shing.")

    gas_price = int(w3.eth.gas_price * gas_multiplier)
    nonce = w3.eth.get_transaction_count(MY_ADDRESS)

    tx = function_call.build_transaction({
        'from': MY_ADDRESS,
        'nonce': nonce,
        'gas': gas_limit,
        'gasPrice': gas_price,
        'chainId': CHAIN_ID
    })

    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

    print(f"✅ Tranzaksiya yuborildi: {w3.to_hex(tx_hash)}")
    return tx_hash

def wait_tx_receipt(tx_hash, timeout=180):
    start = time.time()
    while time.time() - start < timeout:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        if receipt:
            if receipt.status == 1:
                print("🎉 Muvaffaqiyat! Tranzaksiya tasdiqlandi.")
                print(f"Gaz ishlatildi: {receipt.gasUsed}")
                return receipt
            else:
                print("❌ Revert bo'ldi (xato). Kontrakt loglarini tekshiring.")
                return None
        time.sleep(4)
    raise TimeoutError("Tranzaksiya tasdiqlanmadi!")

def run_attack(
    borrow_amount=50000 * 10**6,  # 50,000 USDC
    token_path=[USDC, WETH, USDC],
    router_path=[QUICKSWAP_ROUTER, SUSHISWAP_ROUTER]
):
    print(f"⚡️ Attack boshlanmoqda: {borrow_amount / 10**6} USDC bilan")

    try:
        tx_call = contract.functions.executeStrike(
            token_path[0],          # borrow token
            borrow_amount,
            token_path,
            router_path
        )

        tx_hash = build_and_send_tx(tx_call)
        receipt = wait_tx_receipt(tx_hash)

        if receipt:
            print("Foyda yoki xato loglari kontrakt ichida bo'ladi — Polygonscan da tekshiring.")
    except Exception as e:
        print(f"Xato: {str(e)}")
        print("Sabablar: Noto'g'ri ABI, yetarli balans yo'q, kontrakt funksiyasi mos emas yoki revert.")
# ==================== ISHGA TUSHIRISH ====================
if name == "main":
    if not MY_ADDRESS or not PRIVATE_KEY:
        print("Xato: .env da MY_ADDRESS yoki PRIVATE_KEY yo'q!")
    else:
        try:
            run_attack()
        except KeyboardInterrupt:
            print("\nBot to'xtatildi.")
        except Exception as e:
            print(f"Umumiy xato: {e}")
