require('any-promise/register/rsvp');

//Test Modules
const mocha = require('mocha');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
const expect = chai.expect;
const assert = chai.assert;
chai.use(chaiAsPromised);
