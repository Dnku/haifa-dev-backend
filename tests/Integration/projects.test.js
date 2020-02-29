/* eslint-disable node/no-unpublished-require */
const fs = require('fs');
const util = require('util');
const faker = require('faker');
const _ = require('lodash');
const supertest = require('supertest');
const app = require('../../index');
const sequelize = require('../../config/sequelize');
const Project = require('../../models/Project');
const { removeImg, createRandomImage } = require('../../utils/FileSystem');


let request;

const { log, error } = console;

const establishConnection = async () => {
  try {
    request = supertest(app);
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    log('Connection to database established successfully');
  } catch (ex) {
    error(ex);
    process.exit(0);
  }
};

const terminateConnection = async () => {
  try {
    await sequelize.close();
    app.close();
  } catch (ex) {
    error(ex);
  }
};

describe('/api/projects', () => {
  beforeAll(establishConnection);
  afterAll(terminateConnection);

  describe('GET /', () => {
    let projects = [];
    beforeAll(async () => {
      _.times(10, () => {
        projects.push({
          title: faker.name.findName(),
          description: faker.lorem.paragraph(),
          image: `public/img/${faker.random.uuid()}.jpg`,
          links: [
            { name: faker.name.title(), url: faker.internet.url() },
            { name: faker.name.title(), url: faker.internet.url() }
          ],
          tags: [{ title: faker.name.title() }, { title: faker.name.title() }]
        });
      });
      projects.forEach(project => createRandomImage(project.image));
      projects = await Project.bulkCreate(projects, { include: { all: true } });
    });

    afterAll(async () => {
      projects.forEach(project => removeImg(project.image));
      await Project.destroy({ where: {} });
    });
    it('should return all projects', async () => {
      const res = await request.get('/api/projects');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(10);
    });

    it('should return offset 5 projects', async () => {
      const res = await request.get('/api/projects?offset=5');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(5);
    });

    it('should return limit 2 projects', async () => {
      const res = await request.get('/api/projects?limit=2');
      expect(res.body.length).toBe(2);
    });

    it('should return projects off set 5 and limited to 2', async () => {
      const res = await request.get('/api/projects?limit=2&offset=5');
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /:id', () => {
    let project;
    beforeAll(async () => {
      project = await Project.create(
        {
          title: faker.name.findName(),
          description: faker.lorem.paragraph(),
          image: (await createRandomImage()) || `public/img/${faker.random.uuid()}.jpg`,
          links: [
            { name: faker.name.title(), url: faker.internet.url() },
            { name: faker.name.title(), url: faker.internet.url() }
          ],
          tags: [{ title: faker.name.title() }, { title: faker.name.title() }]
        },
        {
          include: { all: true }
        }
      );
    });
    afterAll(async () => {
      await removeImg(project.image);
      await Project.destroy({ where: {} });
    });

    it('should return 404 if invalid id is passed', async () => {
      const res = await request.get(`/api/projects/${faker.random.uuid()}`);
      expect(res.status).toBe(404);
    });

    it('should return a project if valid id is passed', async () => {
      const res = await request.get(`/api/projects/${project.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', project.title);
      expect(res.body).toHaveProperty('description', project.description);
      expect(res.body).toHaveProperty('image', project.image);
    });
  });

  describe('destroy /:id', () => {
    let project;
    beforeAll(async () => {
      project = await Project.create(
        {
          title: faker.name.findName(),
          description: faker.lorem.paragraph(),
          image: (await createRandomImage()) || `public/img/${faker.random.uuid()}.jpg`,
          links: [
            { name: faker.name.title(), url: faker.internet.url() },
            { name: faker.name.title(), url: faker.internet.url() }
          ],
          tags: [{ title: faker.name.title() }, { title: faker.name.title() }]
        },
        {
          include: { all: true }
        }
      );
    });
    afterAll(async () => {
      (await util.promisify(fs.access)(project.image)) && (await removeImg(project.image));
      await Project.destroy({ where: {} });
    });

    it('should return 404 if invalid id is passed', async () => {
      const res = await request.delete(`/api/projects/${faker.random.uuid()}`);
      expect(res.status).toBe(404);
    });

    it('should return 204 after removing an image', async () => {
      const res = await request.delete(`/api/projects/${project.id}`);
      expect(res.status).toBe(204);
    });
  });

  describe('POST /', () => {
    let project;

    beforeAll(async () => {
      project = {
        title: faker.commerce.product(),
        description: faker.lorem.paragraph(),
        image: (await createRandomImage()) || `public/img/${faker.random.uuid()}.jpg`,
        links: [
          { name: faker.name.title(), url: faker.internet.url() },
          { name: faker.name.title(), url: faker.internet.url() }
        ],
        tags: [{ title: faker.name.title() }, { title: faker.name.title() }]
      };
    });
    afterAll(async () => {
      (await util.promisify(fs.access)(project.image)) && (await removeImg(project.image));
      await Project.destroy({ where: {} });
    });

    it('should return 400 if project is invalid', async () => {
      const res = await request
        .post(`/api/projects/`)
        .field('title', faker.name.title())
        // .field('description', faker.lorem.paragraph())
        .field('tags[0][title]', faker.name.title())
        .field('tags[1][title]', faker.name.title())
        .field('links[0][name]', faker.name.findName())
        .field('links[0][url]', faker.internet.url())
        .field('links[1][name]', faker.name.findName())
        .field('links[1][url]', faker.internet.url())
        .attach('image', project.image);

      expect(res.status).toBe(400);
    });

    it('should return the project if it is valid', async () => {
      const res = await request
        .post(`/api/projects/`)
        .field('title', faker.name.title())
        .field('description', faker.lorem.paragraph())
        .field('tags[0][title]', faker.name.title())
        .field('tags[1][title]', faker.name.title())
        .field('links[0][name]', faker.name.findName())
        .field('links[0][url]', faker.internet.url())
        .field('links[1][name]', faker.name.findName())
        .field('links[1][url]', faker.internet.url())
        .attach('image', project.image);

      expect(res.status).toBe(201);
    });
  });

  describe('PUT /:id', () => {
    let project;
    beforeAll(async () => {
      project = await Project.create(
        {
          title: faker.name.findName(),
          description: faker.lorem.paragraph(),
          image: (await createRandomImage()) || `public/img/${faker.random.uuid()}.jpg`,
          links: [
            { name: faker.name.title(), url: faker.internet.url() },
            { name: faker.name.title(), url: faker.internet.url() }
          ],
          tags: [{ title: faker.name.title() }, { title: faker.name.title() }]
        },
        {
          include: { all: true }
        }
      );
    });
    afterAll(async () => {
      await removeImg(project.image);
      await Project.destroy({ where: {} });
    });

    it('should return 404 if invalid id is passed', async () => {
      const res = await request
        .put(`/api/projects/${faker.random.uuid()}`)
        .field('title', faker.name.title())
        .field('description', faker.lorem.paragraph())
        .field('tags[0][title]', faker.name.title())
        .field('tags[1][title]', faker.name.title())
        .field('links[0][name]', faker.name.findName())
        .field('links[0][url]', faker.internet.url())
        .field('links[1][name]', faker.name.findName())
        .field('links[1][url]', faker.internet.url())
        .attach('image', project.image);

      expect(res.status).toBe(404);
    });

    it('should return 400 if project is invalid', async () => {
      const res = await request
        .put(`/api/projects/${project.id}`)
        .field('title', faker.name.title())
        // .field('description', faker.lorem.paragraph())
        .field('tags[0][title]', faker.name.title())
        .field('tags[1][title]', faker.name.title())
        .field('links[0][name]', faker.name.findName())
        .field('links[0][url]', faker.internet.url())
        .field('links[1][name]', faker.name.findName())
        .field('links[1][url]', faker.internet.url())
        .attach('image', project.image);

      expect(res.status).toBe(400);
    });

    it('should return the project if it is valid', async () => {
      const res = await request
        .put(`/api/projects/${project.id}`)
        .field('title', faker.name.title())
        .field('description', faker.lorem.paragraph())
        .field('tags[0][title]', faker.name.title())
        .field('tags[1][title]', faker.name.title())
        .field('links[0][name]', faker.name.findName())
        .field('links[0][url]', faker.internet.url())
        .field('links[1][name]', faker.name.findName())
        .field('links[1][url]', faker.internet.url())
        .attach('image', project.image);

      expect(res.status).toBe(200);
    });
  });
});