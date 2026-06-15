import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { expect } from "chai";

describe("aether_trade", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AetherTrade as Program;

  const user = Keypair.generate();

  it("Initializes a user account", async () => {
    const [userPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBytes()],
      program.programId
    );

    await program.methods
      .initializeUser(255)
      .accounts({
        userAccount: userPda,
        signer: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const userAccount = await program.account.userAccount.fetch(userPda);
    expect(userAccount.owner.toString()).to.equal(user.publicKey.toString());
    expect(userAccount.isActive).to.be.true;
  });

  it("Records a trade", async () => {
    const [userPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBytes()],
      program.programId
    );

    const tradeId = "trade-001";
    const [tradePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), user.publicKey.toBytes(), Buffer.from(tradeId)],
      program.programId
    );

    await program.methods
      .recordTrade(
        tradeId,
        "WTI",
        0, // long
        new anchor.BN(100),
        new anchor.BN(7843), // $78.43
        new anchor.BN(Date.now() / 1000)
      )
      .accounts({
        tradeAccount: tradePda,
        userAccount: userPda,
        signer: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePda);
    expect(trade.asset).to.equal("WTI");
    expect(trade.side).to.equal(0);
    expect(trade.isSettled).to.be.false;
  });

  it("Settles a trade", async () => {
    const [userPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBytes()],
      program.programId
    );

    const tradeId = "trade-001";
    const [tradePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), user.publicKey.toBytes(), Buffer.from(tradeId)],
      program.programId
    );

    await program.methods
      .settleTrade(new anchor.BN(7950))
      .accounts({
        tradeAccount: tradePda,
        userAccount: userPda,
        signer: user.publicKey,
      })
      .signers([user])
      .rpc();

    const trade = await program.account.tradeAccount.fetch(tradePda);
    expect(trade.isSettled).to.be.true;
    expect(trade.exitPrice.toString()).to.equal("7950");
  });
});
