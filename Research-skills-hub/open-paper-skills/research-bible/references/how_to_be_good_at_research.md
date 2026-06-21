# How to be good at research
Author: vivek
Date: June 11, 2026
Source: https://x.com/itsreallyvivek/article/2064686372737454155
# Nobody Really Teaches You Research

Nobody really teaches you research. You get a desk, a problem someone else picked, and a vague instruction to produce something novel. So most people reverse-engineer the job from what they can see — papers, threads, and announcements — and what they end up learning is how to **look like** a researcher rather than how to **be** one.

The actual skill is a stack of smaller skills, and almost every one of them can be deliberately trained.

## Pick Your Own Problems

[Richard Hamming](YouAndYourResearch.md) had a habit at Bell Labs that made him unpopular at lunch. He'd ask whoever sat near him what the important problems in their field were, then ask why they weren't working on them. People changed tables.

The question stings because most of us have no good answer. We don't choose problems; we absorb them — from an advisor, from whatever a big lab announced last quarter, from the paper everyone is quote-tweeting this week.

The trouble with an absorbed problem is that you hold the conclusion without the reasoning. You know some famous lab cares about a direction, but not why, not what they expect to find, not what would make them drop it. When they pivot, you find out a year later. And on a problem that's already fashionable, you're racing a thousand people who started earlier and have more compute than you.

[John Schulman's guide to ML research](SchulmanGuideToMLResearch.md) splits the work into two modes. In one, you read the literature and hunt for things to improve. In the other, you choose an outcome you genuinely want to exist and reason backwards to the experiments. He argues for the second, and the quiet reason is that it manufactures originality. A goal you actually care about will drag you into territory no survey paper covers.

**Taste**, meanwhile, gets discussed like a gift. It behaves more like a muscle. Predict the result of every experiment before you run it. Cover a paper's results section and guess the numbers from the method alone. Mark down which of this month's releases will matter in two years and check your hit rate later. A forecast plus a correction, repeated a few hundred times, is how every good model gets trained — including the one in your head.

## Upgrade Your Inputs

Shared reading lists produce shared ideas. If your information diet is the trending page of arXiv plus whatever survives the group chat filter, you will reliably reach the same conclusions as everyone else, at the same time, which makes those conclusions worth approximately nothing.

**Old material is criminally underpriced.** This field reruns its own past on a delay: [Mixture of Experts dates to 1991](AdaptiveMixturesOfLocalExperts.md), [LSTMs to 1997](LongShortTermMemory.md), [backprop went mainstream in 1986](LearningRepresentationsByBackPropagatingErrors.md). Rich Sutton needed about a thousand words in 2019 to write [The Bitter Lesson](TheBitterLesson.md), and it predicts the shape of the field better than surveys ten times its length.

[Claude Shannon gave a talk on creative thinking in 1952](CreativeThinking.md) where his opening move was to shrink a problem until it's nearly trivial, crack the small version, then reintroduce the difficulty one piece at a time. That single trick will carry you through more walls than any modern productivity advice.

**Range matters as much as depth.** Interpretability borrows shamelessly from neuroscience. Eval design is mechanism design wearing a lab coat. A working sense of how GPUs actually move memory tells you which architecture papers are doomed before the benchmarks do. And honest statistics might be the rarest skill in ML, where a lot of published rigor is vibes with error bars.

One more thing: **read the paper itself**, not the thread summarizing it. The appendix is where the bodies are buried, and the limitations section is usually the most honest paragraph in the document.

## Write Everything Down

[Paul Graham points out](PuttingIdeasIntoWords.md) that an idea can feel fully formed right up until you try to put it into words. The page finds gaps your head papers over: the assumption you never tested, the step that doesn't actually follow, the two claims that quietly contradict each other.

[Feynman's rule](CargoCultScience.md) was that the first person you must avoid fooling is yourself, because you're the easiest target. Writing is the cheapest defense ever invented.

[Darwin went further and made it procedural](TheAutobiographyOfCharlesDarwin.md). Any fact that cut against his theory got written down on the spot, because he'd caught his own memory deleting inconvenient evidence faster than the convenient kind. Your memory does the same thing to your failed runs.

Keep a log: **hypothesis, setup, expectation, result, updated belief**. Rereading last month's entries is humbling in a way no reviewer can match.

Then put some of it in public. [Olah and Carter's research debt essay](ResearchDebt.md) makes the case that fields choke on undigested ideas, and that a clear explanation is a genuine contribution rather than a service job. A lot of people working in interpretability today found the field through readable posts, not conference papers.

A body of public writing also doubles as the strongest credential you can hold, because it's an unfakeable sample of how you think.

## Tighten the Loop

The stories about Alec Radford rarely involve a single stroke of genius. They involve volume: more runs per day, more wrong ideas discarded per week, a model of reality that updated faster than anyone else's. That's the actual game. Research speed is mostly the speed at which you discover you're wrong.

Which makes tooling a first-class research activity. Launching a run should be one command. Plotting it should be one more. Every experiment should be reproducible from its config, and comparing two runs should take seconds, not an afternoon of archaeology.

[Karpathy's recipe for training neural networks](ARecipeForTrainingNeuralNetworks.md) has a step that pays for itself a hundred times over: **overfit a single batch before training at scale**. Thirty seconds, half your bugs, gone. Shrink everything until it's cheap, get it right, then spend the compute.

And retire the idea that engineering is the junior partner here. At the frontier the two jobs have fused. The researcher who can build the harness, the eval, and the data pipeline is the one whose hypotheses actually get tested. Everyone else is waiting in a queue.

## Stare at the Outputs

A descending loss curve is not analysis, it's reassurance. Your experiments throw off far more information than you consume: transcripts, failure cases, the strange tail of the distribution. Most of it dies unread in a logs folder.

[Karpathy's recipe](ARecipeForTrainingNeuralNetworks.md) starts before any training code gets written, with hours spent on the raw data by hand. Most ML bugs live in the data, and they fail silently. Nothing crashes. You simply get a mediocre model and a wrong theory about why.

[Andrew Ng has taught](MachineLearningYearning.md) the same unglamorous move for over a decade because nothing beats it: pull a hundred failures, read all of them, sort them into piles, attack the biggest pile. It works on models and it works on evals, where a benchmark you've never read transcripts from is a benchmark you don't actually understand. One transcript of genuinely strange behavior will teach you more than the next decimal of accuracy ever will.

## Wander on Purpose

Your first subfield is an accident of timing, so treat it like one. Spend real time in interpretability, in evals, in RL, in systems, before deciding where you live. Somewhere in this field is a corner where your specific weirdness is an unfair advantage, and the only way to locate it is to pay tuition in several places. Nobody waives the tuition.

Run the disposable version of every idea first and let most of them die young. Tune your baselines until it hurts, because the graveyard of ML is full of gains that evaporated against a properly tuned baseline. Ablate until you know which component carries the result. It's usually one, and it's usually not the one in the title.

Breadth is also insurance. Subfields saturate — all of them — usually right after they peak on Twitter. The people who keep producing through those transitions are the ones who already know their way around the neighboring territory.

## Find Your People

[Hamming](YouAndYourResearch.md) noticed a pattern in who ended up doing important work. Colleagues with closed office doors got more done in any given year, and colleagues with open doors did the work that mattered, because the interruptions carried information about what the world actually needed. Your open door is probably an inbox. Keep it that way.

Generosity compounds in research like nothing else. Replicate a result and publish what you find. Release the tool you built for yourself. Explain something hard in plain language. The returns arrive sideways, months later, as the collaboration or the reference or the role you couldn't have applied for.

Float your half-formed ideas in public too, because being wrong on the timeline is far cheaper than being wrong in print. And the collaborator who tells you an idea is bad before you sink three months into it is worth more than compute. That relationship can't be bought, only earned.

## The Long Game

[Pasteur said luck favors the prepared mind, and Hamming built a whole career philosophy on top of it](YouAndYourResearch.md): knowledge and productivity compound like interest. The daily edges look trivial in isolation — what you read, what you record, how fast your loop runs, who you argue with. Give them a few years and they produce careers that look like luck from the outside.

**Start compounding earlier than feels necessary.** Future you already knows this was the cheap part.
