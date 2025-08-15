import { controller, httpPost, httpGet, requestParam, httpDelete } from "inversify-express-utils";
import express from "express";
import { ContentBaseController } from "./ContentBaseController";
import { Block, Element, Section } from "../models";
import { Permissions } from "../helpers";
import { TreeHelper } from "../helpers/TreeHelper";
import { ArrayHelper } from "@churchapps/apihelper";

@controller("/blocks")
export class BlockController extends ContentBaseController {
  @httpGet("/:churchId/tree/:id")
  public async getTree(
    @requestParam("churchId") churchId: string,
    @requestParam("id") id: string,
    req: express.Request<{}, {}, null>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const block: Block = await this.repositories.block.load(churchId, id);
      let result: Block = {};
      if (block?.id !== undefined) {
        const sections: Section[] =
          block.blockType === "elementBlock"
            ? [{ id: "", background: "#FFFFFF", textColor: "dark", blockId: block.id }]
            : await this.repositories.section.loadForBlock(churchId, block.id);
        const allElements: Element[] = await this.repositories.element.loadForBlock(churchId, block.id);
        /*
        const allElements: Element[] = (block.blockType === "elements")
        ? await this.repositories.element.loadByBlockId(churchId, block.id)
        : await this.repositories.element.loadForBlock(churchId, block.id);*/
        TreeHelper.populateAnswers(allElements);
        TreeHelper.populateAnswers(sections);
        result = block;
        result.sections = TreeHelper.buildTree(sections, allElements);
      }
      return result;
    });
  }

  @httpGet("/:id")
  public async get(
    @requestParam("id") id: string,
    req: express.Request<{}, {}, null>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      return await this.repositories.block.load(au.churchId, id);
    });
  }

  @httpGet("/")
  public async loadAll(req: express.Request, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      return await this.repositories.block.loadAll(au.churchId);
    });
  }

  @httpGet("/blockType/:blockType")
  public async loadByType(
    @requestParam("blockType") blockType: string,
    req: express.Request,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      return await this.repositories.block.loadByBlockType(au.churchId, blockType);
    });
  }

  @httpGet("/public/footer/:churchId")
  public async loadFooter(
    @requestParam("churchId") churchId: string,
    req: express.Request,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const footerBlocks = await this.repositories.block.loadByBlockType(churchId, "footerBlock");
      const result: Section[] = [];
      if (footerBlocks.length > 0) {
        const blockIds: string[] = ArrayHelper.getIds(footerBlocks, "id");
        const allBlockSections = await this.repositories.section.loadForBlocks(churchId, blockIds);
        const allBlockElements = await this.repositories.element.loadForBlocks(churchId, blockIds);
        TreeHelper.populateAnswers(allBlockElements);
        TreeHelper.populateAnswers(allBlockSections);

        const footerBlockSections = ArrayHelper.getAll(allBlockSections, "blockId", footerBlocks[0].id);
        footerBlockSections.forEach((s) => {
          s.zone = "siteFooter";
          const blockElements = ArrayHelper.getAll(allBlockElements, "blockId", footerBlocks[0].id);
          const tree = TreeHelper.buildTree([s], blockElements);
          result.push(...tree);
        });
      }
      return result;
    });
  }

  @httpPost("/")
  public async save(req: express.Request<{}, {}, Block[]>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.content.edit)) return this.json({}, 401);
      else {
        const promises: Promise<Block>[] = [];
        req.body.forEach((block) => {
          block.churchId = au.churchId;
          promises.push(this.repositories.block.save(block));
        });
        const result = await Promise.all(promises);
        return result;
      }
    });
  }

  @httpDelete("/:id")
  public async delete(
    @requestParam("id") id: string,
    req: express.Request<{}, {}, null>,
    res: express.Response
  ): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.content.edit)) return this.json({}, 401);
      else {
        await this.repositories.block.delete(au.churchId, id);
        return this.json({});
      }
    });
  }
}
