import { ScrollRestoration, useNavigate } from "react-router-dom"
import { Button } from "@/components/Button/Button"
import Img from "@/components/Image/Img"
import { useEffect, useState } from "react"
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from "@tanstack/react-query"
import { backendSparkApi } from "@/data/api/backendSparkApi"
import { ROUTES } from "@/utils/routes"

import solanaImg from "@/assets/angelStaking/solana.png"
import logo from "@/assets/logos/logo.svg"
import logoType from "@/assets/logos/logo-type-png.png"
import boltLogo from "@/assets/landingPage/bolt-logo-small.png"

const LandingPage = () => {
  const navigate = useNavigate()
  const { publicKey, connected } = useWallet()
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  
  const address = publicKey?.toString() || null

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', address],
    queryFn: () => address ? backendSparkApi.getUser({ address }) : Promise.resolve(null),
    enabled: !!address,
  })

  // Check if user is connected and redirect to projects
  useEffect(() => {
    if (!connected) {
      setIsCheckingConnection(false)
      return
    }

    const checkConnection = async () => {
      if (connected && address) {
        try {
          const userData = await backendSparkApi.getUser({ address })
          if (userData && userData.username) {
            // User is connected and has account, redirect to projects
            navigate(ROUTES.PROJECTS)
            return
          }
        } catch (error) {
          // User might not be fully set up yet
          console.log('User not fully set up:', error)
        }
      }
      
      // Check legacy localStorage connection
      const storedAddress = localStorage.getItem('sparkit-wallet')
      if (storedAddress && !connected) {
        try {
          const userData = await backendSparkApi.getUser({ address: storedAddress })
          if (userData && userData.username) {
            navigate(ROUTES.PROJECTS)
            return
          }
        } catch (error) {
          // Clear invalid stored address
          localStorage.removeItem('sparkit-wallet')
        }
      }
      
      setIsCheckingConnection(false)
    }

    checkConnection()
  }, [connected, address, navigate])

  if (isCheckingConnection || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-fg-primary text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-accent to-bg-secondary text-fg-primary overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-accent/80 backdrop-blur-md border-b border-fg-primary/10">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Img src={logo} size="custom" customClass="w-20 rounded-lg" alt="Spark-it Logo" />
            {/* <Img src={logoType} size="custom" customClass="w-32 rounded-none" alt="Spark-it" /> */}
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-fg-primary/80 hover:text-brand-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-fg-primary/80 hover:text-brand-primary transition-colors">How it Works</a>
            <a href="#ecosystem" className="text-fg-primary/80 hover:text-brand-primary transition-colors">Ecosystem</a>
            <Button
              onClick={() => navigate(ROUTES.GET_STARTED)}
              size="sm"
              className="bg-brand-primary hover:bg-brand-primary/90 text-white px-6"
            >
              Launch App
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-4 py-2 rounded-full text-sm font-medium">
                <span>🚀</span>
                Built on Solana
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                Make your 
                <span className="text-brand-primary"> ideas</span>
                <br />
                become real
              </h1>
              
              <p className="text-xl text-fg-primary/80 leading-relaxed max-w-lg">
                The revolutionary platform where dreamers, builders, and degens unite to fund and create the next generation of world-changing projects.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => navigate(ROUTES.GET_STARTED)}
                  size="xl"
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white px-8 py-4 text-lg font-semibold"
                >
                  Launch App
                </Button>
                <Button
                  onClick={() => navigate(ROUTES.DISCOVER)}
                  size="xl"
                  className="bg-transparent border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white px-8 py-4 text-lg font-semibold transition-all"
                >
                  Explore Projects
                </Button>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-primary">1000+</div>
                  <div className="text-sm text-fg-primary/60">Projects Funded</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-primary">$50M+</div>
                  <div className="text-sm text-fg-primary/60">Total Raised</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-primary">10K+</div>
                  <div className="text-sm text-fg-primary/60">Active Users</div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Interactive Feature Showcase */}
            <div className="relative">
              <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-3xl p-8 border border-fg-primary/10 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">💡</div>
                  <h3 className="text-2xl font-bold mb-3">For Dreamers</h3>
                  <p className="text-fg-primary/80 mb-4">Transform your wildest ideas into reality with community-backed funding</p>
                  <p className="text-sm text-fg-primary/60">Share your vision, get community support, and watch your dreams come to life through decentralized funding.</p>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-brand-primary/20 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-green-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Everything you need to <span className="text-brand-primary">succeed</span>
            </h2>
            <p className="text-xl text-fg-primary/80 max-w-3xl mx-auto">
              From idea conception to market launch, Spark-it provides all the tools and community support you need.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🎯",
                title: "Idea Validation",
                description: "Test your concepts with our community before investing time and resources."
              },
              {
                icon: "💰",
                title: "Decentralized Funding",
                description: "Raise capital through community-driven DAOs and token launches."
              },
              {
                icon: "🤝",
                title: "Builder Marketplace",
                description: "Connect with skilled developers, designers, and specialists."
              },
              {
                icon: "📊",
                title: "Real-time Trading",
                description: "Trade project tokens and participate in the success of ideas."
              },
              {
                icon: "🏛️",
                title: "DAO Governance",
                description: "Democratic decision-making for project direction and funding."
              },
              {
                icon: "🔒",
                title: "Secure & Transparent",
                description: "Built on Solana with full transparency and security."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-accent/50 backdrop-blur-sm rounded-2xl p-6 border border-fg-primary/10 hover:border-brand-primary/30 transition-all group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-fg-primary/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to turn your <span className="text-brand-primary">ideas into reality</span>?
          </h2>
          <p className="text-xl text-fg-primary/80 mb-8">
            Join thousands of dreamers, builders, and degens who are already changing the world.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(ROUTES.GET_STARTED)}
              size="xl"
              className="bg-brand-primary hover:bg-brand-primary/90 text-white px-12 py-4 text-lg font-semibold"
            >
              Launch Your Idea
            </Button>
            <Button
              onClick={() => navigate(ROUTES.DISCOVER)}
              size="xl"
              className="bg-transparent border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white px-12 py-4 text-lg font-semibold transition-all"
            >
              Explore Projects
            </Button>
          </div>
          
          <div className="mt-12 text-sm text-fg-primary/60">
            <p>Available on mobile • Download the app for the best experience</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-fg-primary/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Img src={boltLogo} size="custom" customClass="w-8 h-8 rounded-lg" alt="Spark-it" />
              <Img src={logoType} size="custom" customClass="w-24 rounded-none" alt="Spark-it" />
            </div>
            
            <div className="flex gap-8 text-sm">
              <a href="/terms" className="text-fg-primary/60 hover:text-brand-primary transition-colors">Terms of Service</a>
              <a href="/legal" className="text-fg-primary/60 hover:text-brand-primary transition-colors">Legal</a>
              <a href="https://x.com/sparkdotfun" target="_blank" rel="noopener noreferrer" className="text-fg-primary/60 hover:text-brand-primary transition-colors">Twitter</a>
              <a href="t.me/sparkdotfun" target="_blank" rel="noopener noreferrer" className="text-fg-primary/60 hover:text-brand-primary transition-colors">Telegram</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-fg-primary/10 text-center text-sm text-fg-primary/60">
            <p>&copy; 2024 Spark-it. All rights reserved. Built with ❤️ on Solana.</p>
          </div>
        </div>
      </footer>

      <ScrollRestoration />
    </div>
  )
}

export default LandingPage 
