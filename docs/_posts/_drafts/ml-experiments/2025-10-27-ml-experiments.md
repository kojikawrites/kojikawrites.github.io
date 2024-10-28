---
layout: post
title:  "Machine Learning Experiments"
categories: gamedev machine-learning artificial-intelligence fuzzy-logic
author: hiive
tags: policy-based-learning game-ai npc-behavior llm function-approximation reinforcement-learning
---

LLMs are somewhat controversial currently for a number of reasons, both valid and otherwise. Arguments about use of
others' IP for training, energy use of training and inference, and the threat to existing jobs being three that are 
examples of valid complaints.

All that aside, LLMs are a powerful tool that can be used (somewhat) ethically to provide content and functionality
for games (and other applications).

This post is about the first in a series of experiments to determine the utility of using an LLM to
build behavior policies for NPCs. Specifically, I am setting up a simplistic gridworld environment with a narrowly
defined set of rules and introducing an entity into that world in an attempt to teach it to survive.

For a simple problem like this, the traditional approach would be to use Reinforcement Learning  (RL) to develop a policy
(using a technique such as Q-Learning) to iteratively calculate the best action (or range of actions selected stochastically)
for the entity to take in any given state. Note that one of the key features of this type of learning is that the best
action to take ONLY depends on the current state. Or, in other words, if any historical information is important to the
entity, then it has to be baked into the current state. This isn't important right now, but it will need consideration in
future experiments.

Although I am starting with an very simply entity (based loosely on an ant), the overall aim of this experiment is to 
investigate whether LLMs will be useful in determining behavior policies for more complex game NPCs that would be otherwise
difficult or impossible to train using standard RL (due to time or capacity constraints).







![hiive's Signature]({{ "/assets/images/signature-hiive.png" | relative_url }})

