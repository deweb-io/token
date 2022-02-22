const hardhat = require('hardhat');
const common = require('../common/common');
const log = common.log;
const STACKING_ADDRESS = common.getStakingAddress();

const addresses = [
    '0xDBfb45ac11CE31757E09e96e0820831C6cff37af',
    '0x240eA64aC6a853Ed86FE88AE406001a7Ab339D20',
    '0x05E43A28aFD9B5C13ab921208A9753a4FC042056',
    '0x2abaCd214285E5Aa6f6b763B0Bef7B583240A2CF',
    '0x2EE47cf650b9fE3BC40009D501592258fBB6Fb25',
    '0x9F62257406227b87724ea6B049CFaB63c42df407',
    '0xDC386E065350656cb32215Bfb76F1b3E58c02496',
    '0x6F06FD44B349527A3AC1aBABED7b20e9Bca95Ab2',
    '0x5F0Ea2b991f90FA56E8dfe2029aBc4e5646C451a',
    '0x285B10c73de847Ee35BCB5Cd86f17D55Ff936476',
    '0xa823cF3B2E1610C817984bF45684fFCF089ef557',
    '0x7bb42206CdDc93380ED1115d15fB1e65a1D754FC',
    '0xc4a3F7fcA06E44bF03C7F23dE9254d4FF77953d7',
    '0x4005b3333CEE2Ffd34a1D87D1717866Ff1e6a18B',
    '0x32Db360B39C610D904E68F4A2249d796681b1451',
    '0x1d1D2B11C5d465fACb3C79e809507007598cbC91',
    '0x7b953681D346401b7061a44B9B762DFdd8a71a56',
    '0xadb15AE8FaEE312a994AD10DaC7d413Bc583c3AC',
    '0x5fE610a9CE170fd7203C51292c3f2dbc218D3092',
    '0x6984Cce5dA98d88fD60BbD61AF1e028c33f45744',
    '0xD2433D5401b5299A730943Cf7857FAe69E2bCe50',
    '0xFa7034C50A0B9c5CdF193f9F8A52a3e1Ae9b5a77',
    '0xf0266fd87d474B54Cb46632646890Ed5F40Ab8d0',
    '0x5b8969FCeAE9F2ffC87c884b9cA60575991fb22E',
    '0xBcC8De65f6268f8D573E1C2E13ce1d96B058f769',
    '0xa65be9F279088A7E0cACfBE6323566D737384b9D',
    '0x9349e39a43e837e69eb03F95B8186221F286397d',
    '0x675601af73eb49428850b1b80A62224Eb0735C32',
    '0xE193760da92f227880B683cbd6d199F253e1Dfc0',
    '0xe95175DbbE084D57E908BCC73a2e0592A8e1d04D',
    '0x8E8262e1D15BeF5d4C541A4b36E02c21eec725f8',
    '0x6CF57dd6143C6F5fEc9Db6bF524520397CbE094f',
    '0x9743Bcf99f5c3377071fCdD6eF98C233dd72B882',
    '0x5355D0eA308E5AA61aA32CEeCF5DDf9A6875a7bd',
    '0xCc0096C4e13AB37019F07530f27C16a8315d58b6',
    '0x4a658716c8B40D245377A16F57252b77fdD669b9',
    '0x3F83702c3130BE5438E4246e8F1D20467170Ef70',
    '0xFDEA973C97CE64ecd0293B1241e037e9D2B8E8Be',
    '0xC0749C83227D6f7614153e9CFD16335f3322062D',
    '0x5809185309B9eCb21ff45b16799AD42ba0458327',
    '0x9edc3B5b89d6e88Ff4A3E3A348f29ec14521FfFC',
    '0x4167B8C45ecA7bdA283ff6BBA80839513f584A1A',
    '0x385267E7F4F174eF89BeAEe35E1023d14A3B1464',
    '0xD300D46dD9831958B46f44b5f3f3f31108F4b8d2',
    '0x4A5F120E894Afc9AA9D57dd8E57E781B7f0a2068',
    '0xbc56668cE57015Ae3160157Ea09ff7EFF1EADAFE',
    '0xa6Dc097D56B3bb548c75653f91dEaD68E5160B0A',
    '0x1E39FF332d0bBa267EFe94E196d03BB2991F9CFd',
    '0xACa5E4256832aC54791Aa52A1044Fe42663De355',
    '0xC7e5fB57805cb862f8Ae926b7eDFEde18f903E15',
    '0xf50402538cC14434c4b51B63E6c3B4D2FBe0366E',
    '0xDA3BF63C6586aB728DB44c5bC1abC95F1Dc17687',
    '0x47c24c1F3897cFb06E3B2C77d6BC7186C589B38C',
    '0xDB2e3B325D6d922b0188Ad322C9608d1dFD4B628',
    '0x8f981eA01F124C364415e0e775ddd7c8Ecb8671C',
    '0x8D84D5Bc5f0e2507d9Cc51e24CfdD1340b5a3D1D',
    '0x13aEb7bc075c975f4E7CDB41D19B94B24e90aF54',
    '0xDef09FB0d1d9FB074F61C8b1Be545Bf1A5E9deeb',
    '0x81F5a5AEF1Ca552D2b3AE4A1a1295a88661CE29C',
    '0xdc23097357A39e5F8B2063F45c8786F8404fb3F1',
    '0xa15959aaaa96c0b17d06ffbb2dc10ae249e37bf6',
    '0x11Bd8fbe6a9d1B6558A675DFC474727a684bc344',
    '0x5Ea0A553DEF9f91c126F7a9898C9497027e0092D',
    '0x64E9F1672D0c783E9d99E55cCCc70D80b4c593EB',
    '0xC7fa56f64909B455Aa0Dcba9940296F91F82a447',
    '0x940476d877C2DBcC055D315707758860431494b0',
    '0x93c3B97a3C105ECea6020b88fc80aa6313A05d7B',
    '0x40c839B831C90173dC7fBCe49A25274a4688ddD9',
    '0xd9974e061286b892eB099d8677cB824a6aa3f6B8',
    '0xD39D2Fde45da0Dd673946b0CfeE2e40CDdbAC1b1',
    '0x9AB070b9ec01BFc0d72FA8b9ED8E119bBD7B3B04',
    '0xEFDa899bDac7a7bb796A1245e6060B54f1596bea',
    '0xBD1E8DBb9ea6FF26D66b3918417514DE976a5237',
    '0x2FE6E548F328C7a959428Ab5E7B3BA3A6274678C',
    '0x1D527E700F4aeaC14c805Ce467D6b457CF40923c',
    '0xc4303EC7BAcd20EEF2ef78976eC6232179fee545',
    '0x52C9805Dc7C812E2713669277f0ae64058b92171',
    '0x99351eB05721aD101FEaf432b845DC68a7f896f1',
    '0x439C16F717e391Af159A9Bb4C7C1C5558DDf0711',
    '0xA0247e2DEB34909610155eF095Eca49D9205FF13',
    '0x4389DfFD485Dd7312dc36e7a014cAD4c94ab0eBD',
    '0x76B9b17cce584de58668b574474939C9e6FbAdb3',
    '0xF65414063245196DBf51BaDD7d4Cc5d0E2dA229d',
    '0x46D35Cb6Bab2a106DAE7B201be149bD4ed534348',
    '0xD96BcBc1071C8174CC442D61f5d8817911eCE1b6',
    '0x374a70284d76A9216fE1D4a14433EE1c23ff46B9',
    '0x80AF4D533d298BF79280C2C9A6646cD99925009D'
];

const wei = 10**18;
const ZERO = hardhat.ethers.BigNumber.from(0);

async function main() {
    if (!STACKING_ADDRESS)
        throw new Error('No Stacking address is missing. aborting.');

    const Staking = await hardhat.ethers.getContractFactory('Staking');
    const staking = Staking.attach(STACKING_ADDRESS);

    let totalInvestorsStakeAmount = 0;

    for (const addressIndex in addresses) {
        const address = addresses[addressIndex];
        const numberOfStakes = await staking.getNumOfStakes(address);
        if (numberOfStakes == 0)
            continue;

        const stakesIndexes = Array.from(Array(numberOfStakes.toNumber()).keys());
        let totalStaked = ZERO;

        for (const stakeIndex in stakesIndexes) {
            totalStaked = totalStaked.add((await staking.stakes(address, stakeIndex)).amount);
            console.log(totalStaked);
        }

        totalStaked = totalStaked / wei;
        console.log(`${address} | ${totalStaked}`);

        totalInvestorsStakeAmount += totalStaked;
    }

    console.log(`total: ${totalInvestorsStakeAmount}`);
}


main().then().catch(err => console.log(err));