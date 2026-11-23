import './PageHeader.css'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description: string
  badge: string
}

export default function PageHeader({ eyebrow, title, description, badge }: PageHeaderProps) {
  return (
    <header className="workpalace-page-header">
      <div>
        <span className="workpalace-page-header__eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <span className="workpalace-page-header__badge">
        <span aria-hidden="true" />
        {badge}
      </span>
    </header>
  )
}
