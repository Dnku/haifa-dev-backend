const Project = require('../models/Project');
const AppError = require('../utils/AppError');
const Link = require('../models/Link');
const Tag = require('../models/Tag');

/**
 * get all the projects
 */
exports.getProjects = async (req, res) => {
  const projects = await Project.findAll({
    subQuery: true,
    ...req.queryParams,
    include: { all: true }
  });

  res.send({
    status: 'Success',
    results: projects.length,
    data: projects
  });
};

/**
 * get project by id
 */
exports.getProject = async (req, res) => {
  const project = await Project.findByPk(req.params.id, {
    include: { all: true }
  });
  // validate if project exists
  if (!project) throw new AppError('The project with the given ID was not found.', 404);

  res.send({
    status: 'Success',
    data: project
  });
};

/**
 * delete project by id
 */
exports.deleteProject = async (req, res) => {
  // find a single user with the id
  const project = await Project.findByPk(req.params.id);
  // validate dev profiles existence in the database
  if (!project) throw new AppError('The project with the given ID was not found.', 404);

  await project.destroy();

  // send status if successes
  res.status(204).json({
    status: 'Success',
    data: null
  });
};

/**
 * create new project with link tags via request body
 */
exports.createProject = async (req, res) => {
  // validate from project replicates
  const project = await Project.create(req.body, {
    include: { all: true }
  });
  res.status(201).send({
    status: 'Success',
    data: project
  });
};

/**
 * find project with primary key via param id and update via request body
 */
exports.updateProject = async (req, res) => {
  const project = await Project.findByPk(req.params.id, { include: { all: true } });
  // check if the profile exists
  if (!project) throw new AppError('The project with the given ID was not found.', 404);

  // clear old data
  await Link.destroy({ where: { projectId: req.params.id } });
  await Tag.destroy({ where: { ProjectId: req.params.id } });

  // create links if any
  if (req.body.links) {
    req.body.links.forEach(link => {
      link.projectId = req.params.id;
    });
    await Link.bulkCreate(req.body.links);
  }

  // create tags if any
  if (req.body.tags) {
    req.body.tags.forEach(tag => {
      tag.ProjectId = req.params.id;
    });
    await Tag.bulkCreate(req.body.tags);
  }

  // save project changes
  await project.update(req.body);
  // refresh and get the updated version of the instance
  await project.reload({ include: { all: true } });

  res.send({
    status: 'Success',
    data: project
  });
};
