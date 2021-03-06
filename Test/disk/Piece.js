require('any-promise/register/rsvp');
const randomAccessFile = require('random-access-file');
const SeekPointer = require("../../disk/seekPointer.js");
const Piece = require("../../disk/piece.js");
const Promise = require('any-promise');
const fsp = require('fs-promise');
const crypto = require('crypto');
const mocha = require('mocha');
const fs = require("fs");
const os = require('os');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
const expect = chai.expect;
const assert = chai.assert;
chai.use(chaiAsPromised);


const files = ["./Test/disk/file1.bin", "./Test/disk/file2.bin"];
const outputs = ["./Test/disk/output1.bin", "./Test/disk/output2.bin"];


/*######## UNIT TESTS ######## */
describe("##### PIECE TESTS #####", function(){
    const promesses = [];
    const contents = [];

    before(function(){
      files.forEach(function(fileName){
          const fileContent = crypto.randomBytes(10);
          contents.push(fileContent);
        fs.writeFileSync(fileName, fileContent)
      });

      contents.forEach(function(data,index){
        console.log("File "+index+" : "+data.toString("hex"))
      })
    });

    const raf1 = new randomAccessFile(files[0]);
    const raf2 = new randomAccessFile(files[1]);

    describe("- Init Seek Pointers", function(){
      it("It should set the right file cursors for each piece", function(){

        /*Piece 1 => Length : 3
                    File 1 Offset : 8  ; Piece Offset : 0
                    File 2 Offset : 0  ; Piece Offset : 2
          Piece 2 => Length : 3
                    File 2 Offset : 1 : Piece Offset : 0
        */
          const piece1 = new Piece(null);
          const piece2 = new Piece(null);
          piece1.addSeekPointer(new SeekPointer(raf1, 8, 0));
        piece1.addSeekPointer(new SeekPointer(raf2, 0, 2));
        piece2.addSeekPointer(new SeekPointer(raf2, 1, 0));

        expect(piece1.getPointerIndex(0)).to.equal(0);
        expect(piece1.getPointerIndex(1)).to.equal(0);
        expect(piece1.getPointerIndex(2)).to.equal(1)
      })
    });

    describe("*** Read Tests ***", function(){
        const piece1 = new Piece(null, 3);
        const piece2 = new Piece(null, 3);
        piece1.addSeekPointer(new SeekPointer(raf1, 8, 0));
      piece1.addSeekPointer(new SeekPointer(raf2, 0, 2));


      describe("- Read 1 block from a Non Overlap Piece", function(){
        it("It should return one block from one file", function(){
            const blockRead = piece1.read(0, 2);
            const expectedResult = contents[0].slice(8);
            return blockRead.should.eventually.deep.equal(expectedResult)
          })
        });

      describe("- Read 1 block from a Overlap Piece", function(){
        it("It should concat 2 blocks from 2 files", function(){
            const blockRead = piece1.read(0, 3);
            const expectedResult = Buffer.concat([contents[0].slice(8), contents[1].slice(0, 1)]);
            return blockRead.should.eventually.deep.equal(expectedResult)
        })
      })
    });

    describe("*** Write Tests ***", function(){
      outputs.forEach(function(outputName){
        fs.writeFileSync(outputName, Buffer.alloc(10))
      });

        const raf1 = new randomAccessFile(outputs[0]);
        const raf2 = new randomAccessFile(outputs[1]);

        const piece1 = new Piece(null, 3);
        const piece2 = new Piece(null, 3);
        piece1.addSeekPointer(new SeekPointer(raf1, 8, 0));
      piece1.addSeekPointer(new SeekPointer(raf2, 0, 2));

      describe("- Write 1 block to a Non Overlap Piece", function(){
        it("It should write data to the right place", function(){
            const bytesWritten = 2;
            const blockWritten = piece1.write(0, Buffer([0xff, 0xff]));
            return blockWritten.should.eventually.equal(bytesWritten)
        })
      });

      describe("- Write 1 block to a Overlap Piece", function(){
        it("It should write data to both files", function(){
            const bytesWritten = 3;
            const blockWritten = piece1.write(0, Buffer([0xee, 0xee, 0xee]));
            return blockWritten.should.eventually.equal(bytesWritten)
        })
      })

    });

    describe("*** Insert Block Tests ***", function(){
        const block1 = {begin: 0, size: 5};
        const block2 = {begin: 10, size: 5};
        const piece = new Piece(null, 20);
        beforeEach(function(){
        piece.blocks = [];
        piece.blocks.push(block1);
        piece.blocks.push(block2)
      });

      describe("Insert one block between 2 blocks of different begin value", function(){
        it("It should insert block between 2 others blocks", function(){
            const block3 = {begin: 5, size: 5};
            piece.insertBlock(block3.begin, block3.size);
          expect(piece.blocks).to.deep.equal([block1, block3, block2])
        })
      });

      describe("Insert one block between 2 blocks with one sharing the same begin value", function(){
        it("It should insert the longest block before", function(){
            const block3 = {begin: 0, size: 10};
            piece.insertBlock(block3.begin, block3.size);
          expect(piece.blocks).to.deep.equal([block3, block1, block2])
        })
      });

      describe("Insert one block at the end", function(){
        it("It should insert the block at the end of the Array", function(){
            const block3 = {begin: 11, size: 5};
            piece.insertBlock(block3.begin, block3.size);
          expect(piece.blocks).to.deep.equal([block1, block2, block3])
        })
      })
    });

    describe("*** Merge Blocks Tests ***", function(){
        const block1 = {begin: 0, size: 5};
        const block2 = {begin: 10, size: 5};
        const piece = new Piece(null, 20);
        beforeEach(function(){
        piece.blocks = [];
        piece.blocks.push(block1);
        piece.blocks.push(block2)
      });

      describe("Merge 2 adjacents blocks without overlap", function(){
        it("It should merge block1 and block3", function(){
            const block3 = {begin: 5, size: 3};
            piece.insertBlock(block3.begin, block3.size);
          piece.mergeBlocks();
          expect(piece.blocks).to.deep.equal([{begin : 0, size : 8}, block2])
        })
      });

      describe("Merge 2 adjacents blocks with overlap", function(){
        it("It should merge block1 and block3 without summing length", function(){
            const block3 = {begin: 3, size: 3};
            piece.insertBlock(block3.begin, block3.size);
          piece.mergeBlocks();
          expect(piece.blocks).to.deep.equal([{begin : 0, size : 6}, block2])
        })
      });

      describe("Merge 3 adjacents blocks without overlap", function(){
        it("It should return only one block", function(){
            const block3 = {begin: 5, size: 5};
            piece.insertBlock(block3.begin, block3.size);
          piece.mergeBlocks();
          expect(piece.blocks).to.deep.equal([{begin : 0, size : 15}])
        })
      });

      describe("Merge 3 adjacents blocks with overlap", function(){
        it("It should return only one block", function(){
            const block3 = {begin: 3, size: 9};
            piece.insertBlock(block3.begin, block3.size);
          piece.mergeBlocks();
          expect(piece.blocks).to.deep.equal([{begin : 0, size : 15}])
        })
      });

      describe("Merge 2 blocks with 1 block at the end", function(){
        it("It should merge block2 and block3", function(){
            const block3 = {begin: 13, size: 8};
            piece.insertBlock(block3.begin, block3.size);
          piece.mergeBlocks();
          expect(piece.blocks).to.deep.equal([block1, {begin : 10, size : 11}])
        })
      });

      describe("Merge 2 groups of 2 blocks with one at the end", function(){
        it("It should merge block 1/block 3 and block 2/block 4", function(){
            const block3 = {begin: 3, size: 4};
            const block4 = {begin: 13, size: 8};
            piece.insertBlock(block4.begin, block4.size);
          piece.insertBlock(block3.begin, block3.size);
          piece.mergeBlocks();
          expect(piece.blocks).to.deep.equal([{begin : 0, size : 7}, {begin : 10, size : 11}])
        })
      });

      describe("Merge 2 blocks with in completely included in the other", function(){
        it("It should delete block3", function(){
            const block3 = {begin: 3, size: 2};
            piece.insertBlock(block3.begin, block3.size);
          piece.mergeBlocks();
          expect(piece.blocks).to.deep.equal([block1, block2])
        })
      })
    })

});
