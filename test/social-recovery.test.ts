import { BigNumber, Wallet } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import {
  EntryPoint,
  TestRecoveryToken,
  TestSocialRecoveryAccount,
  TestSocialRecoveryAccount__factory,
  TestSocialRecoveryAccountFactory,
  TestSocialRecoveryAccountFactory__factory,
} from "../typechain";
import {
  createAccountOwner,
  fund,
  advanceTimeTo,
  checkForGeth,
  deployEntryPoint,
} from "./testutils";

describe("SocialRecovery", function () {
  let entryPoint: EntryPoint;
  let accountOwner: Wallet;
  let recoveryAccount: TestSocialRecoveryAccount;
  let recoveryAccountFactory: TestSocialRecoveryAccountFactory;
  let recoveryToken: TestRecoveryToken;
  let alice: Wallet;
  let bob: Wallet;
  let charlie: Wallet;
  let dave: Wallet;

  const ethersSigner = ethers.provider.getSigner();
  const TIME_INTERVAL = BigNumber.from(86400);
  const Uint16_MAX = 65535;

  before(async () => {
    //this.timeout(20000);
    await checkForGeth();
    accountOwner = createAccountOwner();
    alice = createAccountOwner();
    bob = createAccountOwner();
    charlie = createAccountOwner();
    dave = createAccountOwner();
    entryPoint = await deployEntryPoint();

    recoveryAccountFactory =
      await new TestSocialRecoveryAccountFactory__factory(ethersSigner).deploy(
        entryPoint.address
      );
    await recoveryAccountFactory.createAccount(accountOwner.address, 0);
    const accountAddress = await recoveryAccountFactory.getAddress(
      accountOwner.address,
      0
    );
    recoveryAccount = TestSocialRecoveryAccount__factory.connect(
      accountAddress,
      ethersSigner
    );

    const tokenAddress = await recoveryAccount.recoveryToken();
    const TestRecoveryToken = await ethers.getContractFactory(
      "TestRecoveryToken"
    );
    recoveryToken = TestRecoveryToken.attach(tokenAddress);
    await fund(accountOwner.address);
    await fund(alice.address);
    await fund(bob.address);
    await fund(charlie.address);
  });

  describe("register guardian", () => {
    before(async () => {
      await recoveryAccount
        .connect(accountOwner)
        .setGuardianMaxSupply(3, { gasLimit: 10e6 });
      await recoveryAccount
        .connect(accountOwner)
        .registerGuardian([bob.address, charlie.address, dave.address], 2);
    });

    it("should increase total supply", async () => {
      expect(await recoveryToken.getTotalSupply()).to.be.equal(3);
    });

    it("should revert if exceeds max supply", async () => {
      await expect(
        recoveryAccount
          .connect(accountOwner)
          .registerGuardian([alice.address], 2)
      ).to.be.revertedWith("exceed maximum guardians");
    });

    it("should revert if register duplicate guardian", async () => {
      await recoveryAccount.connect(accountOwner).setGuardianMaxSupply(4);
      await expect(
        recoveryAccount.connect(accountOwner).registerGuardian([bob.address], 2)
      ).to.be.revertedWith("duplicate guardians");
    });
  });

  describe("guardins confirm recovery", () => {
    before("should nonce is zero", async () => {
      expect(await recoveryToken.getNonce()).to.be.equal(0);
    });
    it("should revert before the register time delay", async () => {
      await expect(
        recoveryToken.connect(bob).confirmReocvery(alice.address)
      ).to.be.revertedWith("have to pass 1 day at least");
    });

    it("should increase recovery token balance of wallet", async () => {
      await advanceTimeTo(TIME_INTERVAL);
      await recoveryToken.connect(bob).confirmReocvery(alice.address);
      expect(
        await recoveryToken.balanceOf(recoveryAccount.address, alice.address)
      ).to.be.equal(1);
    });

    it("should revert if caller is not a guardian", async () => {
      await expect(
        recoveryToken.connect(alice).confirmReocvery(alice.address)
      ).to.be.revertedWith("caller not a guardian");
    });

    it("should revert if a guardian confirms twice", async () => {
      await expect(
        recoveryToken.connect(bob).confirmReocvery(alice.address)
      ).to.be.revertedWith("already confirm");
    });

    it("should revert If the token balance is smaller than thresold", async () => {
      await expect(
        recoveryAccount.recoveryWallet(alice.address)
      ).to.be.revertedWith("Not enough confirmations");
    });

    describe("recovery wallet", () => {
      before("confirm thresold recovery and recovery wallet", async () => {
        expect(await recoveryAccount.owner()).to.be.equal(accountOwner.address);
        await recoveryToken.connect(charlie).confirmReocvery(alice.address);
      });
      it("should revert If the token balance is smaller than thresold", async () => {
        await expect(
          recoveryAccount.recoveryWallet(bob.address)
        ).to.be.revertedWith("Not enough confirmations");
      });

      it("should increase recovery token balance of wallet", async () => {
        expect(
          await recoveryToken.balanceOf(recoveryAccount.address, alice.address)
        ).to.be.equal(2);
      });

      it("should change wallet owner and update nonce", async () => {
        await recoveryAccount.recoveryWallet(alice.address);
        expect(await recoveryAccount.owner()).to.be.equal(alice.address);
        expect(await recoveryToken.getNonce()).to.be.equal(1);
      });
    });
  });

  describe("delete guardian", () => {
    before(async () => {
      await recoveryAccount.connect(alice).deleteGuardian([bob.address]);
    });

    it("should revert if the argument is not a guardian", async () => {
      await expect(
        recoveryAccount.connect(alice).deleteGuardian([accountOwner.address])
      ).to.be.revertedWith("not a guardian");
    });

    it("should revert before delete time delay", async () => {
      await expect(
        recoveryAccount.connect(alice).deleteGuardian([bob.address])
      ).to.be.revertedWith("have to pass 1 day at least"); //.
    });

    it("should decrease total supply of recovery token", async () => {
      await advanceTimeTo(TIME_INTERVAL);
      await recoveryAccount.connect(alice).deleteGuardian([bob.address]);
      expect(await recoveryToken.getTotalSupply()).to.be.equal(2);
    });

    it("should delete guardian from list", async () => {
      expect(await recoveryToken.isGuardian(bob.address)).to.be.equal(
        Uint16_MAX
      );
    });

    it("should revert If the call makes the number of guardians less than threshold", async () => {
      await expect(
        recoveryAccount.connect(alice).deleteGuardian([dave.address])
      ).revertedWith("Threshold exceeds guardians count");
    });
  });
});
