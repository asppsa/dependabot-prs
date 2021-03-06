#!/usr/bin/env node

const { Octokit } = require("@octokit/rest")
const chalk = require('chalk')
const contrast = require('contrast')

// https://github.com/settings/tokens
const { DEPENDABOT_PRS_GITHUB_TOKEN, DEPENDABOT_PRS_REPOS = "" } = process.env

const owner = 'blake-education'
const repos = DEPENDABOT_PRS_REPOS.split(/\s+/).map(repo => repo.trim())

const octokit = new Octokit({
  auth: `token ${DEPENDABOT_PRS_GITHUB_TOKEN}`
})

async function getPullsForRepo(repo) {
  const { data: pulls } = await octokit.pulls.list({
    owner,
    repo,
    state: 'open',
  })

  return (await Promise.all(pulls.map(async ({ number, labels, title, html_url: url }) => {
    if (!labels.find((label) => label.name === 'dependencies')) return

    const { data: { mergeable, mergeable_state } } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: number
    })

    return { repo, number, labels, title, url, mergeable, mergeable_state }
  }))).flat().filter(Boolean)
}

;(async function () {
  const pulls = (await Promise.all(repos.map(getPullsForRepo))).flat()

  for (const { repo, number, labels, title, url, mergeable } of pulls) {
    const dotColor = mergeable ? 'green' : (mergeable === false ? 'red' : 'orange')

    const labelText = labels.map((label) => {
      const bgColor = `#${label.color}`
      const color = contrast(bgColor) === 'light' ? 'black' : 'white'
      return chalk.bgHex(bgColor).keyword(color)(label.name)
    }).join(' ')

    console.log(`${chalk.blue(repo)}: ${chalk.magenta(`#${number}`)} ${chalk.bold(title)} ${chalk.keyword(dotColor)('•')} ${labelText} ${url}`)
  }
})()
