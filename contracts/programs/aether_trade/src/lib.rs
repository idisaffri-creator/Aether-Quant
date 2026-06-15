use anchor_lang::prelude::*;

declare_id!("AETHRp1aceh0lder111111111111111111111111111111");

#[program]
pub mod aether_trade {
    use super::*;

    pub fn initialize_user(ctx: Context<InitializeUser>, bump: u8) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.owner = ctx.accounts.signer.key();
        user_account.bump = bump;
        user_account.total_trades = 0;
        user_account.volume_usd = 0;
        user_account.is_active = true;
        Ok(())
    }

    pub fn record_trade(
        ctx: Context<RecordTrade>,
        trade_id: String,
        asset: String,
        side: u8,    // 0 = long, 1 = short
        quantity: u64,
        price: u64,  // USD * 100 (2 decimal precision)
        timestamp: i64,
    ) -> Result<()> {
        let user = &mut ctx.accounts.user_account;
        require!(user.is_active, ErrorCode::AccountInactive);

        let trade = &mut ctx.accounts.trade_account;
        trade.trade_id = trade_id;
        trade.owner = ctx.accounts.signer.key();
        trade.asset = asset;
        trade.side = side;
        trade.quantity = quantity;
        trade.entry_price = price;
        trade.timestamp = timestamp;
        trade.is_settled = false;

        user.total_trades = user.total_trades.checked_add(1).unwrap();
        user.volume_usd = user.volume_usd.checked_add(quantity.checked_mul(price).unwrap()).unwrap();

        emit!(TradeEvent {
            trade_id: trade.trade_id.clone(),
            asset: trade.asset.clone(),
            side,
            quantity,
            price,
            timestamp,
        });

        Ok(())
    }

    pub fn settle_trade(ctx: Context<SettleTrade>, exit_price: u64) -> Result<()> {
        let trade = &mut ctx.accounts.trade_account;
        require!(!trade.is_settled, ErrorCode::AlreadySettled);
        require!(trade.owner == ctx.accounts.signer.key(), ErrorCode::Unauthorized);

        trade.exit_price = Some(exit_price);
        trade.is_settled = true;

        let pnl = calculate_pnl(trade.side, trade.entry_price, exit_price, trade.quantity);

        emit!(TradeSettledEvent {
            trade_id: trade.trade_id.clone(),
            entry_price: trade.entry_price,
            exit_price,
            pnl,
        });

        Ok(())
    }

    pub fn deactivate_user(ctx: Context<DeactivateUser>) -> Result<()> {
        let user = &mut ctx.accounts.user_account;
        require!(user.owner == ctx.accounts.signer.key(), ErrorCode::Unauthorized);
        user.is_active = false;
        Ok(())
    }
}

fn calculate_pnl(side: u8, entry: u64, exit: u64, quantity: u64) -> i64 {
    let diff = if exit > entry { exit - entry } else { entry - exit };
    let raw_pnl = diff.checked_mul(quantity).unwrap() as i64;

    if side == 0 {
        if exit > entry { raw_pnl } else { -raw_pnl }
    } else {
        if entry > exit { raw_pnl } else { -raw_pnl }
    }
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        seeds = [b"user", signer.key().as_ref()],
        bump = bump,
        payer = signer,
        space = 8 + 32 + 1 + 8 + 8 + 1 + 100
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(trade_id: String)]
pub struct RecordTrade<'info> {
    #[account(
        init,
        seeds = [b"trade", signer.key().as_ref(), trade_id.as_bytes()],
        bump,
        payer = signer,
        space = 8 + 64 + 32 + 16 + 1 + 8 + 8 + 8 + 1 + 100
    )]
    pub trade_account: Account<'info, TradeAccount>,
    #[account(mut, seeds = [b"user", signer.key().as_ref()], bump = user_account.bump)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleTrade<'info> {
    #[account(mut)]
    pub trade_account: Account<'info, TradeAccount>,
    #[account(mut, seeds = [b"user", signer.key().as_ref()], bump = user_account.bump)]
    pub user_account: Account<'info, UserAccount>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateUser<'info> {
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
    pub signer: Signer<'info>,
}

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub bump: u8,
    pub total_trades: u64,
    pub volume_usd: u64,
    pub is_active: bool,
}

#[account]
pub struct TradeAccount {
    pub trade_id: String,
    pub owner: Pubkey,
    pub asset: String,
    pub side: u8,
    pub quantity: u64,
    pub entry_price: u64,
    pub exit_price: Option<u64>,
    pub timestamp: i64,
    pub is_settled: bool,
}

#[event]
pub struct TradeEvent {
    pub trade_id: String,
    pub asset: String,
    pub side: u8,
    pub quantity: u64,
    pub price: u64,
    pub timestamp: i64,
}

#[event]
pub struct TradeSettledEvent {
    pub trade_id: String,
    pub entry_price: u64,
    pub exit_price: u64,
    pub pnl: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Account is inactive")]
    AccountInactive,
    #[msg("Trade already settled")]
    AlreadySettled,
    #[msg("Unauthorized signer")]
    Unauthorized,
}
