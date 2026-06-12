# AI-Human Research OS

The folder structure is intentionally simple and non-linear. Research ideas,
references, experiments, figures, and writing often update each other, so the folders
are organized by material type rather than by a fixed workflow.


## TODO

- [ ] add find-research-skills, which can help the AI agent to find the right research skills in `Research-skills-hub/` folder or even online
- [ ] create a skill which can access them markdown files of paper, such as 'hf cli', 'https://github.com/timf34/arxiv2md','deepxive cli' and so on.
- [ ] in References/ folder, maintain a paper-wiki, which includes the summary, key points, and relation to the research project for each paper. The paper-wiki can be implemented as a markdown file or a simple database. The paper-wiki can help the AI agent to quickly find relevant papers and understand their content.
- [ ] Design this template as a CLI so agents can use commands to understand the whole
   research project.
- [ ] Design bash commands that make agents deterministically read specific files, such as `INSTRUCTION.md`, at the start of each session.
- [ ] Add memory mechanisim. Doing research is a long-term process, and the AI agent needs to remember the research progress, including the ideas, references, and experiments. The memory can be implemented as a simple database or a more complex knowledge graph. The memory can also be used to track the research progress and provide feedback to the human researcher. 
   - [ ] The memory should include global memory, which stores the overall research progress and important information, and local memory, which stores the right now research project. Because the research always can be cross domain. And for ADHDers, they may have multiple research projects at the same time, so the local memory can help them to focus on the current project.
- [ ] Add `read_paper` workflow， which manages the process of reading a paper, including summarizing it, extracting key points, and relating it to the research project. The workflow can be used in both `Ideas/` and `References/` folders. Besides, when AI meet a problem that it cannot solve, it can use this workflow to read relevant papers and find solutions. All the new reading papers will be stored in `References/` folder, and the summary and key points will be stored in `Ideas/` folder.
- [ ] Add a workspace where holding a group meeting with humans and AI, humans discuss research with the AI. Because AI can search paper and read fast, they can point out if the idea is feasible or not, and they can also point out relevant papers that humans might miss. This can be a good way to brainstorm research ideas and get feedback on them. After discussion, the AI can implement the idea or feedback immediately.
- [ ] The final goal of the repo is to build a Research OS.
- [ ] add interface according to [AlookAI](https://github.com/alookai/alook) and [Wanman](https://github.com/chekusu/wanman)

## Reference projects
- [AutoR](https://github.com/AutoX-AI-Labs/AutoR)
- [autolab](https://github.com/autolabhq/autolab)